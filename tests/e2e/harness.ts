/// <reference types="node" />
// Shared Playwright harness: loads dist/ as an unpacked extension and serves fixtures locally.
import { chromium, test as base, type BrowserContext, type Worker } from '@playwright/test';
import { createReadStream, existsSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist');
const fixtures = path.join(root, 'tests/e2e/fixtures');
const sampleVideo = path.join(root, 'landing-page/bigbuckbunny.mp4');

function startServer(): Promise<{ server: Server; origin: string }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const file = url.pathname === '/video.mp4' ? sampleVideo : path.join(fixtures, path.normalize(url.pathname));
    if (!file.startsWith(fixtures) && file !== sampleVideo) return void res.writeHead(403).end();
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': file.endsWith('.mp4') ? 'video/mp4' : 'text/html; charset=utf-8' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      resolve({ server, origin: `http://127.0.0.1:${port}` });
    })
  );
}

type Fixtures = { context: BrowserContext; sw: Worker; extensionId: string; origin: string };

const expect = base.expect;

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  origin: async ({}, use) => {
    const { server, origin } = await startServer();
    await use(origin);
    server.close();
  },
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    if (!existsSync(path.join(dist, 'manifest.json'))) throw new Error('Run `npm run build` first');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]
    });
    // No real network in tests: block the remote welcome page / license endpoints.
    await context.route(/x2-speedup\.vercel\.app|lemonsqueezy\.com/, (route) => route.abort());
    await use(context);
    await context.close();
  },
  sw: async ({ context }, use) => {
    const isOurs = (w: Worker) => /^chrome-extension:\/\/[^/]+\/background\/background\.js$/.test(w.url());
    const sw =
      context.serviceWorkers().find(isOurs) ??
      (await context.waitForEvent('serviceworker', { predicate: isOurs }));
    // The worker can be visible before extension bindings are ready.
    await expect.poll(() => sw.evaluate(() => typeof chrome !== 'undefined' && !!chrome.storage)).toBe(true);
    await use(sw);
  },
  extensionId: async ({ sw }, use) => {
    await use(new URL(sw.url()).host);
  }
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
