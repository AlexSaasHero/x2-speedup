// Real screenshots of the extension for the landing page (WebP), taken from the built extension.
// Run from the repo root after `npm run build`:  node docs/landing-assets/make-ext-shots.mjs
// Output: landing-page/img/popup-free.webp (popup, Free plan) and landing-page/img/badge-on-video.webp
// (the on-video speed badge over our own demo lecture, lecture.html: no third-party content).
// Demo stats live only in this throwaway browser profile.
import { chromium } from '@playwright/test';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'landing-page/img');
mkdirSync(out, { recursive: true });
if (!existsSync(path.join(dist, 'manifest.json'))) throw new Error('Run `npm run build` first');

const PORT = 8003;
const LECTURE = `http://localhost:${PORT}/lecture.html`;
const server = createServer((req, res) => {
  const file = path.join(here, new URL(req.url, 'http://x').pathname);
  if (!file.startsWith(here) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  createReadStream(file).pipe(res);
}).listen(PORT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--autoplay-policy=no-user-gesture-required']
});
await ctx.route(/lemonsqueezy\.com|vercel\.app/, (r) => r.abort());
const isOurs = (w) => /\/background\/background\.js$/.test(w.url());
const sw = ctx.serviceWorkers().find(isOurs) ?? (await ctx.waitForEvent('serviceworker', { predicate: isOurs }));
const extId = new URL(sw.url()).host;
await sleep(1500);
for (const p of ctx.pages()) if (!p.url().startsWith('about:blank')) await p.close().catch(() => {});

// A week of demo stats (≈ 3 h 12 min this week), Free plan (no license), no review banner.
const now = Date.now();
const day = (n) => { const d = new Date(now - n * 86_400_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const days = {};
[2280, 1500, 0, 2100, 1860, 1620, 2160].forEach((s, i) => (days[day(i)] = { saved: s, watched: Math.round(s * 1.1) }));
const total = Object.values(days).reduce((a, d) => ({ saved: a.saved + d.saved, watched: a.watched + d.watched }), { saved: 0, watched: 0 });
await sw.evaluate((d) => chrome.storage.local.set(d), { timeSaved: { version: 1, days, total }, hudEnabled: true, reviewPrompt: { state: 'done', snoozedUntil: 0 } });

const lecture = await ctx.newPage();
await lecture.goto(LECTURE);
await lecture.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 30_000 });
await sw.evaluate(async (s) => {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((t) => chrome.tabs.sendMessage(t.id, { action: 'SET_SPEED', speed: s }).catch(() => null)));
}, 2.5);
await lecture.bringToFront();
await lecture.mouse.move(700, 400);
await lecture.mouse.move(720, 420);
await sleep(600);
// The badge sits in the video's top-left corner: crop that area of the real player.
const v = await lecture.evaluate(() => { const r = document.getElementById('v').getBoundingClientRect(); return { x: r.x, y: r.y }; });
const badgePng = await lecture.screenshot({ clip: { x: v.x, y: v.y, width: 250, height: 120 } });

// Popup opened as a tab: point its "active tab" at the lecture (same trick as the Store screenshots).
const popup = await ctx.newPage();
await popup.addInitScript((url) => {
  if (!location.pathname.includes('/popup/')) return;
  const query = chrome.tabs.query.bind(chrome.tabs);
  chrome.tabs.query = async (q, cb) => {
    const self = await chrome.tabs.getCurrent();
    const tab = (await query({})).filter((t) => t.id !== self?.id).sort((a, b) => b.id - a.id)[0];
    const res = tab ? [{ ...tab, url, title: 'Intro to Statistics – Lecture 4', active: true }] : [];
    if (typeof cb === 'function') return void cb(res);
    return res;
  };
}, LECTURE);
await popup.setViewportSize({ width: 350, height: 640 });
await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
await sleep(2500);
await popup.bringToFront(); // screenshots of a background tab never resolve
const h = await popup.evaluate(() => Math.ceil(document.querySelector('.container, main, body > div')?.getBoundingClientRect().bottom ?? document.body.scrollHeight));
const popupPng = await popup.screenshot({ clip: { x: 0, y: 0, width: 350, height: Math.min(h + 2, 900) }, fullPage: true });
await ctx.close();
server.close();

// PNG → WebP with the browser's encoder (no extra tools needed).
const browser = await chromium.launch();
const page = await browser.newPage();
async function toWebp(png, file) {
  const res = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.88));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (const x of buf) s += String.fromCharCode(x);
    return { b64: btoa(s), w: img.width, h: img.height };
  }, png.toString('base64'));
  writeFileSync(path.join(out, file), Buffer.from(res.b64, 'base64'));
  console.log(`${file}: ${res.w}×${res.h} (CSS ${res.w / 2}×${res.h / 2})`);
}
await toWebp(popupPng, 'popup-free.webp');
await toWebp(badgePng, 'badge-on-video.webp');
await browser.close();
