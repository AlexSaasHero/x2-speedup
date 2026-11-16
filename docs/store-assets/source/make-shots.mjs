// Chrome Web Store assets for LectureSpeed 1.9.1: 5 screenshots (1280×800), small promo tile (440×280)
// and marquee (1400×560). Same palette and fonts as the landing page.
// Original content only: a made-up lecture on a generic course page (source/lecture.html) and the real
// extension from dist/. No third-party logos or player UI.
// Run from the repo root after `npm run build`:  node docs/store-assets/source/make-shots.mjs
// Output: docs/store-assets/1.9.1/*.jpg (JPEG: the Store wants no alpha channel).
// Demo data (Pro license state, time-saved stats, bookmarks) lives only in a throwaway profile; the
// popup's clock is frozen on a Friday so the weekly numbers don't depend on the day you run this.
// The 1.9.0 version of this script is in _to_delete/docs/store-assets/source/make-shots-1.9.0.mjs.
import { chromium } from '@playwright/test';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const dist = path.join(root, 'dist');
const out = path.resolve(here, '../1.9.1');
mkdirSync(out, { recursive: true });
if (!existsSync(path.join(dist, 'manifest.json'))) throw new Error('Run `npm run build` first');

const PORT = 8004;
const LECTURE = `http://localhost:${PORT}/lecture.html`;
const server = createServer((req, res) => {
  const file = path.join(here, new URL(req.url, 'http://x').pathname);
  if (!file.startsWith(here) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  createReadStream(file).pipe(res);
}).listen(PORT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 1. raw captures with the real extension -------------------------------------------------
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

// Demo data, independent of the real weekday: the popup's clock is frozen on a Friday and the stats
// are seeded Monday→Friday of that week. Shown: this week 3h 12m, today 41m, this page 24m, total 9h 52m.
const DEMO_NOW = new Date(2026, 10, 20, 15, 0, 0); // Friday 20 Nov 2026, 15:00 local
const now = DEMO_NOW.getTime();
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = (n) => key(new Date(now - n * 86_400_000));
const days = {};
// Fri (today) 41m · Thu 36m · Wed 30m · Tue 40m · Mon 45m → week 3h 12m
[2460, 2160, 1800, 2400, 2700].forEach((s, i) => (days[day(i)] = { saved: s, watched: Math.round(s * 1.1) }));
// Earlier weeks: 16 × 25m = 6h 40m → total 9h 52m
for (let i = 8; i < 40; i += 2) days[day(i)] = { saved: 1500, watched: 1650 };
const total = Object.values(days).reduce((a, d) => ({ saved: a.saved + d.saved, watched: a.watched + d.watched }), { saved: 0, watched: 0 });
const PAGE_SAVED = 24 * 60; // "This page" comes live from the content script: shown as 24m
const cp = (time, label) => ({ id: `demo-${time}`, time, formattedTime: `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`, label, pageTitle: 'Intro to Statistics – Lecture 4', url: LECTURE, createdAt: now });
// Checked "just now" on the demo Friday, so the popup (frozen on that day) shows a fresh Pro license.
const PRO = { license: { key: 'DEMO-PRO', status: 'active', source: 'lemonsqueezy', lastValidAt: now, lastCheckedAt: now, expiresAt: null } };
// Free first (screenshot 1: going past 2x is free); the demo Pro license is added later.
await sw.evaluate((d) => chrome.storage.local.set(d), {
  timeSaved: { version: 1, days, total },
  videoCheckpoints: { [`localhost:${PORT}/lecture.html`]: [cp(724, 'Definition of standard deviation'), cp(1907, 'This will be on the exam'), cp(2890, 'Worked example, part 2')] },
  hudEnabled: true,
  reviewPrompt: { state: 'done', snoozedUntil: 0 }
});

const lecture = await ctx.newPage();
await lecture.goto(LECTURE);
await lecture.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 30_000 });
const setSpeed = (speed) => sw.evaluate(async (s) => {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((t) => chrome.tabs.sendMessage(t.id, { action: 'SET_SPEED', speed: s }).catch(() => null)));
}, speed);
const showBadge = async () => { await lecture.bringToFront(); await lecture.mouse.move(700, 400); await lecture.mouse.move(720, 420); await sleep(500); };
const playerClip = async () => lecture.evaluate(() => { const r = document.querySelector('.player').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });

await setSpeed(2.5);
await showBadge();
const shot = {};
shot.player = await lecture.screenshot({ clip: await playerClip() });
// The whole course page, tall enough for the full player with its controls.
await lecture.setViewportSize({ width: 1280, height: 760 });
await showBadge();
shot.page = await lecture.screenshot();
await lecture.setViewportSize({ width: 1280, height: 720 });

// Popup opened as a tab: point its "active tab" at the lecture, freeze its clock on the demo Friday
// and show the demo "this page" time.
const popup = await ctx.newPage();
await popup.clock.setFixedTime(DEMO_NOW);
await popup.addInitScript(([url, pageSaved]) => {
  if (!location.pathname.includes('/popup/')) return;
  const query = chrome.tabs.query.bind(chrome.tabs);
  chrome.tabs.query = async (q, cb) => {
    const self = await chrome.tabs.getCurrent();
    const tab = (await query({})).filter((t) => t.id !== self?.id).sort((a, b) => b.id - a.id)[0];
    const res = tab ? [{ ...tab, url, title: 'Intro to Statistics – Lecture 4', active: true }] : [];
    if (typeof cb === 'function') return void cb(res);
    return res;
  };
  const send = chrome.tabs.sendMessage.bind(chrome.tabs);
  const patch = (r) => (r && typeof r === 'object' && 'sessionSaved' in r ? { ...r, sessionSaved: pageSaved } : r);
  chrome.tabs.sendMessage = (...args) => {
    const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
    if (cb) return send(...args, (r) => cb(patch(r)));
    return send(...args).then(patch);
  };
}, [LECTURE, PAGE_SAVED]);
await popup.setViewportSize({ width: 350, height: 640 });
await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
await sleep(2500);
const popupShot = async () => {
  await popup.bringToFront();
  const h = await popup.evaluate(() => Math.ceil(document.querySelector('.container, main, body > div')?.getBoundingClientRect().bottom ?? document.body.scrollHeight));
  return popup.screenshot({ clip: { x: 0, y: 0, width: 350, height: Math.min(h + 2, 900) }, fullPage: true });
};
shot.popupSpeedFree = await popupShot();

// Pro from here on (screenshots 3, 4, 5).
await sw.evaluate((d) => chrome.storage.local.set(d), PRO);
await popup.reload();
await sleep(2500);
shot.popupSpeed = await popupShot();
await popup.click('.tab-btn[data-tab="precision"]');
await sleep(1000);
shot.popupPrecision = await popupShot();
// Frame-by-frame + A-B loop in use: set A, let it play, set B, then step one frame.
await popup.click('#abSetA'); await sleep(2500);
await popup.click('#abSetB'); await sleep(600);
await popup.click('#nextFrameBtn'); await sleep(600);
shot.popupAB = await popupShot();
await showBadge();
shot.playerAB = await lecture.screenshot({ clip: await playerClip() });
await ctx.close();
server.close();

// ---- 2. composition ---------------------------------------------------------------------------
const b64 = (buf) => buf.toString('base64');
const font = (f) => `data:font/woff2;base64,${b64(readFileSync(path.join(root, 'landing-page/fonts', f)))}`;
const svg = (f) => `data:image/svg+xml;base64,${b64(readFileSync(path.join(root, 'landing-page/img', f)))}`;
const png = (buf) => `data:image/png;base64,${b64(buf)}`;
const CSS = `
  @font-face { font-family: B; font-weight: 700 800; src: url(${font('bricolage-grotesque-700-800-latin.woff2')}); }
  @font-face { font-family: A; font-weight: 400; src: url(${font('atkinson-hyperlegible-400-latin.woff2')}); }
  @font-face { font-family: A; font-weight: 400 700; src: url(${font('bricolage-grotesque-digits-400-800.woff2')}); unicode-range: U+0030-0039; }
  * { box-sizing: border-box; margin: 0; }
  body { overflow: hidden; font-family: A, sans-serif; color: #1B1E3C; background: #F5F7FB; position: relative; }
  .brand { position: absolute; display: flex; align-items: center; gap: 10px; font: 800 22px B, sans-serif; letter-spacing: -0.02em; }
  .brand img { width: 32px; height: 32px; }
  h1 { font: 800 54px/1.04 B, sans-serif; letter-spacing: -0.025em; }
  .sub { font-size: 22px; color: #5A6278; margin-top: 12px; line-height: 1.35; }
  .shot { position: absolute; display: block; border-radius: 14px; box-shadow: 0 30px 60px -28px rgba(27, 30, 60, .55); }
  .frame { border: 1px solid rgba(27, 30, 60, .14); }
  .hl { position: relative; z-index: 0; white-space: nowrap; }
  .hl::before { content: ''; position: absolute; z-index: -1; inset: 18% -6px 2% -6px; background: #FFE14D; transform: rotate(-1.5deg); border-radius: 4px; }
`;
const page = (w, h, body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${extra} body{width:${w}px;height:${h}px}</style></head><body>${body}</body></html>`;
const brand = (x, y, dark = false) => `<div class="brand" style="left:${x}px;top:${y}px;${dark ? 'color:#F5F7FB' : ''}"><img src="${svg(dark ? 'logo-mark-dark.svg' : 'logo-mark.svg')}" alt="">LectureSpeed</div>`;
const head = (title, sub) => `${brand(64, 40)}<div style="position:absolute;left:64px;top:96px;width:1150px"><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`;

const W = 1280, H = 800;
const assets = {
  '1-faster-than-2x': page(W, H, `${head('Watch lectures <span class="hl">faster than 2x</span>.', 'Your lecture player stops at 2x. LectureSpeed keeps going.')}
    <img class="shot frame" src="${png(shot.player)}" style="left:64px;top:262px;width:800px">
    <img class="shot" src="${png(shot.popupSpeedFree)}" style="right:64px;top:226px;width:330px">`),
  '2-where-your-lectures-are': page(W, H, `${head('Works where your lectures are.', 'Lecture recordings, also when they are embedded in your course page.')}
    <img class="shot frame" src="${png(shot.page)}" style="left:226px;top:248px;width:828px">`),
  '3-bookmarks': page(W, H, `${head('Bookmark what matters for the exam.', 'Save the moment with a note. Jump back in one click.')}
    <img class="shot frame" src="${png(shot.player)}" style="left:64px;top:300px;width:720px">
    <img class="shot" src="${png(shot.popupPrecision)}" style="right:96px;top:226px;width:340px">`),
  '4-replay-hard-parts': page(W, H, `${head('Replay the hard parts.', 'Frame-by-frame for slides and formulas. A-B loop for the explanation that didn\'t click.')}
    <img class="shot frame" src="${png(shot.playerAB)}" style="left:64px;top:300px;width:720px">
    <img class="shot" src="${png(shot.popupAB)}" style="right:96px;top:226px;width:340px">`),
  '5-hours-back': page(W, H, `${brand(64, 40)}<div style="position:absolute;left:64px;top:240px;width:470px">
      <h1>See the hours<br>you get back.</h1>
      <p class="sub">The time you saved today, this week, in total and on each page.</p></div>
    <img class="shot" src="${png(shot.popupSpeed)}" style="right:96px;top:80px;height:640px">`),
  'promo-tile-440x280': page(440, 280, `<div style="position:absolute;inset:0;background:#1B1E3C;padding:30px 32px;color:#F5F7FB">
      ${brand(32, 28, true)}
      <h1 style="position:absolute;left:32px;bottom:30px;width:376px;font-size:36px;color:#F5F7FB">Lectures at your speed. <span style="color:#FFE14D">Not your player's.</span></h1></div>`),
  'marquee-1400x560': page(1400, 560, `<div style="position:absolute;inset:0;background:#1B1E3C;color:#F5F7FB">
      ${brand(80, 64, true)}
      <div style="position:absolute;left:80px;top:150px;width:700px">
        <h1 style="font-size:76px;color:#F5F7FB">Lectures at your speed.<br><span style="color:#FFE14D">Not your player's.</span></h1>
        <p class="sub" style="color:#B4BAD0;font-size:26px;margin-top:22px">Watch recorded lectures faster than 2x.</p></div>
      <img class="shot" src="${png(shot.popupPrecision)}" style="right:96px;top:48px;height:464px;box-shadow:0 30px 60px -20px rgba(0,0,0,.6)"></div>`)
};
const sizes = { 'promo-tile-440x280': [440, 280], 'marquee-1400x560': [1400, 560] };

const browser = await chromium.launch();
const pg = await browser.newPage();
for (const [name, html] of Object.entries(assets)) {
  const [w, h] = sizes[name] ?? [W, H];
  await pg.setViewportSize({ width: w, height: h });
  await pg.setContent(html);
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(200);
  writeFileSync(path.join(out, `${name}.jpg`), await pg.screenshot({ type: 'jpeg', quality: 92 }));
  console.log('Wrote', `docs/store-assets/1.9.1/${name}.jpg`, `${w}×${h}`);
}
await browser.close();
