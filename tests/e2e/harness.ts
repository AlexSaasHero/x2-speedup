/// <reference types="node" />
// Shared Playwright harness: loads dist/ as an unpacked extension and serves fixtures locally.
import { chromium, test as base, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { createReadStream, existsSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from '../../src/shared/migrations';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist');
const fixtures = path.join(root, 'tests/e2e/fixtures');

/** 60 s of 8 kHz mono 8-bit silence as WAV: decodable by every Chromium build (no H.264 needed). */
function makeWav(seconds = 60, rate = 8000, sample: (t: number) => number = () => 0): Buffer {
  const data = rate * seconds;
  const b = Buffer.alloc(44 + data, 128);
  for (let i = 0; i < data; i++) b[44 + i] = Math.max(0, Math.min(255, Math.round(128 + 127 * sample(i / rate))));
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + data, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write('data', 36);
  b.writeUInt32LE(data, 40);
  return b;
}
const MEDIA = makeWav();
/** "Speech" pattern: 1.5 s of 440 Hz tone, then 2.5 s of silence, repeated. */
const SPEECH = makeWav(60, 8000, (t) => (t % 4 < 1.5 ? 0.4 * Math.sin(2 * Math.PI * 440 * t) : 0));
const FILES: Record<string, Buffer> = { '/media.wav': MEDIA, '/speech.wav': SPEECH };

function startServer(): Promise<{ server: Server; origin: string }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const media = FILES[url.pathname];
    if (media) {
      // Range support is what makes the media seekable.
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
      if (!m) {
        res.writeHead(200, { 'content-type': 'audio/wav', 'content-length': media.length, 'accept-ranges': 'bytes' });
        return void res.end(media);
      }
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), media.length - 1) : media.length - 1;
      res.writeHead(206, {
        'content-type': 'audio/wav',
        'content-length': end - start + 1,
        'content-range': `bytes ${start}-${end}/${media.length}`,
        'accept-ranges': 'bytes'
      });
      return void res.end(media.subarray(start, end + 1));
    }
    const file = path.join(fixtures, path.normalize(url.pathname));
    if (!file.startsWith(fixtures)) return void res.writeHead(403).end();
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      resolve({ server, origin: `http://127.0.0.1:${port}` });
    })
  );
}

type WorkerFixtures = { extContext: BrowserContext; sw: Worker; extensionId: string; origin: string };
type TestFixtures = { resetState: void };

const expect = base.expect;

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // eslint-disable-next-line no-empty-pattern
  origin: [
    async ({}, use) => {
      const { server, origin } = await startServer();
      await use(origin);
      server.close();
    },
    { scope: 'worker' }
  ],
  // eslint-disable-next-line no-empty-pattern
  // One browser with the extension per worker; tests get it as `context`.
  extContext: [
    async ({}, use) => {
      if (!existsSync(path.join(dist, 'manifest.json'))) throw new Error('Run `npm run build` first');
      const context = await chromium.launchPersistentContext('', {
        channel: 'chromium',
        args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--autoplay-policy=no-user-gesture-required']
      });
      // No real network in tests: block the remote welcome page / license endpoints.
      await context.route(/x2-speedup\.vercel\.app|lemonsqueezy\.com/, (route) => route.abort());
      await use(context);
      await context.close();
    },
    { scope: 'worker' }
  ],
  sw: [async ({ extContext: context }, use) => {
    const isOurs = (w: Worker) => /^chrome-extension:\/\/[^/]+\/background\/background\.js$/.test(w.url());
    const sw =
      context.serviceWorkers().find(isOurs) ??
      (await context.waitForEvent('serviceworker', { predicate: isOurs }));
    // The worker can be visible before extension bindings are ready.
    await expect.poll(() => sw.evaluate(() => typeof chrome !== 'undefined' && !!chrome.storage)).toBe(true);
    await waitForMigration(sw);
    // Close the onboarding tab opened at install (its network is blocked anyway).
    for (const p of context.pages()) if (!p.url().startsWith('about:blank')) await p.close().catch(() => {});
    await use(sw);
  }, { scope: 'worker' }],
  extensionId: [async ({ sw }, use) => {
    await use(new URL(sw.url()).host);
  }, { scope: 'worker' }],
  /** Every test starts from a fresh-install storage state and no open pages. */
  context: async ({ extContext }, use) => {
    await use(extContext);
  },
  resetState: [
    async ({ extContext: context, sw }, use) => {
      const defaults = migrate({}).set;
      for (const p of context.pages()) if (!p.url().startsWith('about:blank')) await p.close().catch(() => {});
      await sw.evaluate(
        (d) => Promise.all([chrome.storage.session.clear(), chrome.storage.local.clear().then(() => chrome.storage.local.set(d))]),
        defaults
      );
      await use();
      for (const p of context.pages()) await p.close().catch(() => {});
    },
    { auto: true }
  ]
});

export { expect };

/** Wait until the background migration has written the current schema. */
export async function waitForMigration(sw: Worker): Promise<Record<string, unknown>> {
  for (let i = 0; i < 50; i++) {
    const data = await sw.evaluate(() => chrome.storage.local.get(null));
    if (data.schemaVersion) return data;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('migration did not run');
}

/** Send a popup-style message to every tab; resolves with the first answer (frames without media stay silent). */
export async function sendToTabs(sw: Worker, message: Record<string, unknown>): Promise<any> {
  return sw.evaluate(async (msg) => {
    const tabs = await chrome.tabs.query({});
    const answers = await Promise.all(
      tabs.map((t) => (t.id ? chrome.tabs.sendMessage(t.id, msg).catch(() => null) : null))
    );
    return answers.find((a) => a) ?? null;
  }, message);
}

/** Wait until the content script has found media and is ready in the page's top frame. */
export async function rateOf(page: Page, selector = '#v'): Promise<number> {
  return page.locator(selector).evaluate((m: HTMLMediaElement) => m.playbackRate);
}
