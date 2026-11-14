// Lecture-platform quirks (src/content/quirks.ts) against local fixtures served on the platforms'
// host names: the content script decides by the host of its own frame.
import type { BrowserContext, Frame, Page } from '@playwright/test';
import { expect, sendToTabs, test } from './harness';

const PANOPTO = 'https://uni.hosted.panopto.com';

/** Serve the local fixture server under `host` (pages, media and all). */
async function serveAs(context: BrowserContext, host: string, origin: string) {
  await context.route(`${host}/**`, async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: origin + url.pathname + url.search });
    await route.fulfill({ response });
  });
}

const rates = (f: Frame | Page) =>
  f.evaluate(() => [...document.querySelectorAll('video')].map((v) => v.playbackRate));
const clockTime = (f: Frame | Page) => f.evaluate(() => (document.getElementById('clock') as HTMLVideoElement).currentTime);

async function playerFrame(page: Page): Promise<Frame> {
  let found: Frame | undefined;
  await expect
    .poll(async () => {
      for (const f of page.frames()) {
        const ready = await f.evaluate(() => [...document.querySelectorAll('video')].filter((v) => v.readyState > 1 && !v.paused).length).catch(() => 0);
        if (ready === 2) return !!(found = f);
      }
      return false;
    }, { timeout: 20_000 })
    .toBe(true);
  return found!;
}

test.describe('lecture platforms', () => {
  test.afterEach(async ({ context }) => {
    await context.unroute(`${PANOPTO}/**`).catch(() => {});
  });

  for (const embedded of [false, true]) {
    test(`Panopto${embedded ? ' inside an LMS iframe' : ''}: the speed reaches both synced streams (BUGS #22)`, async ({ context, sw, origin }) => {
      await serveAs(context, PANOPTO, origin);
      const page = await context.newPage();
      await page.goto(embedded ? `${origin}/lms.html?src=${encodeURIComponent(`${PANOPTO}/panopto.html`)}` : `${PANOPTO}/panopto.html`);
      const f = await playerFrame(page);
      expect(new URL(f.url()).host).toBe('uni.hosted.panopto.com');

      await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2 }).then((r) => r?.speed)).toBe(2);
      await expect.poll(() => rates(f)).toEqual([2, 2]);

      // The lecture clock (the small stream) really runs at 2x.
      const t0 = await clockTime(f);
      const w0 = Date.now();
      await page.waitForTimeout(3000);
      const pace = ((await clockTime(f)) - t0) / ((Date.now() - w0) / 1000);
      expect(pace).toBeGreaterThan(1.6);

      // The player pulling the screen stream back to the clock does not lose the speed.
      await page.waitForTimeout(1000);
      expect(await rates(f)).toEqual([2, 2]);
    });
  }

  test('a generic site keeps the default: only the main video changes speed', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await page.goto(`${origin}/panopto.html`);
    const f = await playerFrame(page);
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2 }).then((r) => r?.speed)).toBe(2);
    await expect.poll(() => rates(f)).toEqual([1, 2]);
  });
});
