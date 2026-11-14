// Lecture-platform quirks (src/content/quirks.ts) against local fixtures served on the platforms'
// host names: the content script decides by the host of its own frame.
import type { BrowserContext, Frame, Page } from '@playwright/test';
import { expect, sendToTabs, test } from './harness';

const PANOPTO = 'https://uni.hosted.panopto.com';
const ECHO360 = 'https://test.echo360.org';

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
    await context.unroute(`${ECHO360}/**`).catch(() => {});
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

  const rate = (page: Page) => page.evaluate(() => (document.getElementById('v') as HTMLVideoElement).playbackRate);
  /** The rate stays at `want` for `ms`, sampled every 100 ms (the player writes every 700 ms). */
  async function staysAt(page: Page, want: number, ms = 2500) {
    const seen = new Set<number>();
    for (let t = 0; t < ms; t += 100) {
      seen.add(await rate(page));
      await page.waitForTimeout(100);
    }
    return [...seen].every((r) => r === want) ? want : [...seen];
  }

  async function openEcho360(context: BrowserContext, sw: Parameters<typeof sendToTabs>[0], origin: string) {
    await serveAs(context, ECHO360, origin);
    const page = await context.newPage();
    await page.goto(`${ECHO360}/echo360.html`);
    await expect.poll(() => page.evaluate(() => (document.getElementById('v') as HTMLVideoElement).readyState)).toBeGreaterThan(0);
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
    return page;
  }

  test("Echo360: the player's Play button does not reset the speed (BUGS #23)", async ({ context, sw, origin }) => {
    const page = await openEcho360(context, sw, origin);
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2 }).then((r) => r?.speed)).toBe(2);
    await page.click('#play');
    await page.waitForTimeout(1000);
    expect(await staysAt(page, 2)).toBe(2);
    expect(await page.evaluate(() => (window as any).writes)).toBeGreaterThan(2); // the player did write 1x
    // Pause / Play again with the player's buttons.
    await page.click('#pause');
    await page.waitForTimeout(500);
    await page.click('#play');
    await page.waitForTimeout(1000);
    expect(await staysAt(page, 2)).toBe(2);
    expect((await sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }))?.currentSpeed).toBe(2);
    expect(await sw.evaluate(() => chrome.storage.local.get('defaultSpeed').then((r) => r.defaultSpeed))).toBe(2);
  });

  test("Echo360: a speed picked in the player's menu (no Play) is respected", async ({ context, sw, origin }) => {
    const page = await openEcho360(context, sw, origin);
    await page.click('#play');
    await page.waitForTimeout(1500);
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2 }).then((r) => r?.speed)).toBe(2);
    expect(await staysAt(page, 2, 1500)).toBe(2);
    await page.click('#speed-1-5');
    await page.waitForTimeout(500);
    expect(await staysAt(page, 1.5)).toBe(1.5);
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.currentSpeed)).toBe(1.5);
  });
});
