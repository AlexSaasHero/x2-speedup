// Lecture-platform quirks (src/content/quirks.ts) against local fixtures served on the platforms'
// host names: the content script decides by the host of its own frame.
import type { BrowserContext, Frame, Page } from '@playwright/test';
import { expect, sendToTabs, setPro, test } from './harness';

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

  test("Echo360: the player's own speed menu is ignored: the extension owns the speed (BUGS #24)", async ({ context, sw, origin }) => {
    await sw.evaluate(() => chrome.storage.session.remove('lectureToastShown'));
    const page = await openEcho360(context, sw, origin);
    await page.click('#play');
    await page.waitForTimeout(1500);
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2 }).then((r) => r?.speed)).toBe(2);
    await page.click('#speed-1-5');
    await page.waitForTimeout(500);
    expect(await staysAt(page, 2)).toBe(2);
    expect((await sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }))?.currentSpeed).toBe(2);
    // The "Speed controlled by LectureSpeed" toast was shown, and only once for the browser session.
    expect(await sw.evaluate(() => chrome.storage.session.get('lectureToastShown').then((r) => r.lectureToastShown))).toBe(true);
  });

  for (const host of [PANOPTO, ECHO360]) {
    test(`a player that resets to 1x at random moments keeps the chosen speed on ${new URL(host).host} (BUGS #24)`, async ({ context, sw, origin }) => {
      await serveAs(context, host, origin);
      const page = await context.newPage();
      await page.goto(`${host}/random-reset.html`);
      await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
      await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2 }).then((r) => r?.speed)).toBe(2);
      await page.click('#play');
      const time = () => page.evaluate(() => (document.getElementById('v') as HTMLVideoElement).currentTime);

      let samples = 0;
      let at2 = 0;
      const sample = async (ms: number) => {
        for (const end = Date.now() + ms; Date.now() < end; ) {
          samples++;
          if ((await rate(page)) === 2) at2++;
          await page.waitForTimeout(50);
        }
      };
      await page.waitForTimeout(1000);
      const t0 = await time();
      const w0 = Date.now();
      await sample(6000);
      const pace = ((await time()) - t0) / ((Date.now() - w0) / 1000);
      // seek, pause/play, click on the video, shortcut
      await page.evaluate(() => { (document.getElementById('v') as HTMLVideoElement).currentTime = 30; });
      await sample(1500);
      await page.evaluate(() => (document.getElementById('v') as HTMLVideoElement).pause());
      await page.click('#play');
      await sample(1500);
      await page.click('#v');
      await sample(1500);
      await page.keyboard.press('d');
      await sample(1500);

      expect(await page.evaluate(() => (window as any).writes)).toBeGreaterThan(20);
      expect(pace).toBeGreaterThan(1.8);
      expect(at2 / samples).toBeGreaterThan(0.85); // the rest is D's 2.1 or a reset caught within ~250 ms
      await expect.poll(() => rate(page)).toBe(2.1);
      expect(await staysAt(page, 2.1, 2000)).toBe(2.1);
    });
  }

  const overlayVisible = (f: Frame | Page) => f.locator('[data-speedup-overlay][data-visible]').count().then((n) => n > 0);

  test('lecture platforms: the speed badge does not stay over the title', async ({ context, sw, origin }) => {
    await serveAs(context, PANOPTO, origin);
    const page = await context.newPage();
    await page.goto(`${PANOPTO}/panopto.html`);
    const f = await playerFrame(page);
    await page.hover('#screen');
    await page.mouse.move(300, 200);
    await page.waitForTimeout(800);
    expect(await overlayVisible(f)).toBe(false); // no badge on hover
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2 }).then((r) => r?.speed)).toBe(2);
    await expect.poll(() => overlayVisible(f)).toBe(true); // reappears when the speed changes
    await page.mouse.move(310, 210); // pointer still over the video
    await page.waitForTimeout(2600);
    expect(await overlayVisible(f)).toBe(false); // hidden after 2 s
  });

  test('a generic site still shows the badge on hover', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await page.goto(`${origin}/panopto.html`);
    await playerFrame(page);
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
    await page.hover('#screen');
    await page.mouse.move(300, 200);
    await expect.poll(() => overlayVisible(page)).toBe(true);
  });

  // ---- QA 2026-11-16: a player that fights back (BUGS #24), the off-screen <video>, the badge corner ----

  /** The frame (page or LMS iframe) that runs the fixture on `host`. */
  async function fixtureFrame(page: Page, host: string): Promise<Frame> {
    let found: Frame | undefined;
    await expect
      .poll(async () => {
        found = page.frames().find((f) => f.url().startsWith(host));
        return found ? await found.evaluate(() => (document.getElementById('v') as HTMLMediaElement | null)?.readyState ?? 0).catch(() => 0) : 0;
      }, { timeout: 20_000 })
      .toBeGreaterThan(0);
    return found!;
  }

  /** Effective speed (video seconds / real seconds while playing, seeks excluded) and the 1x dips seen by the page. */
  async function measure(f: Frame, want: number) {
    const log = (await f.evaluate(() => (window as any).rateLog)) as [number, number, number][];
    let video = 0;
    let real = 0;
    for (let i = 1; i < log.length; i++) {
      const dt = (log[i][0] - log[i - 1][0]) / 1000;
      const dv = log[i][2] - log[i - 1][2];
      if (dt > 0 && dt < 0.25 && dv >= 0 && dv < 1.5) {
        video += dv;
        real += dt;
      }
    }
    const off = log.filter(([, r]) => Math.abs(r - want) > 0.001);
    return { pace: video / real, real, frames: log.length, offFrames: off.length, offRates: [...new Set(off.map(([, r]) => r))] };
  }

  for (const [label, host, embedded] of [['Echo360', ECHO360, false], ['Panopto inside an LMS iframe', PANOPTO, true]] as const) {
    test(`${label}: a player that writes its own speed and fights back keeps 2.6x through play, pause/play and a seek (BUGS #24)`, async ({ context, sw, origin }) => {
      await serveAs(context, host, origin);
      const page = await context.newPage();
      await page.goto(embedded ? `${origin}/lms.html?src=${encodeURIComponent(`${host}/echo360-live.html`)}` : `${host}/echo360-live.html`);
      const f = await fixtureFrame(page, host);
      await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2.6 }).then((r) => r?.speed)).toBe(2.6);

      const click = (sel: string) => f.click(sel);
      await click('#play');
      await page.waitForTimeout(800);
      await f.evaluate(() => { (window as any).rateLog = []; });
      // ≥ 10 s of playback: 2 pause/play cycles and a seek on the bar.
      await page.waitForTimeout(2500);
      await click('#pause'); await page.waitForTimeout(400); await click('#play');
      await page.waitForTimeout(2500);
      await f.evaluate(() => { (document.getElementById('v') as HTMLMediaElement).currentTime = 5; });
      await page.waitForTimeout(2500);
      await click('#pause'); await page.waitForTimeout(400); await click('#play');
      await page.waitForTimeout(2800);

      const m = await measure(f, 2.6);
      console.log(`${label}: pace ${m.pace.toFixed(2)}x over ${m.real.toFixed(1)} s of playback, ${m.offFrames}/${m.frames} frames off 2.6x`, m.offRates);
      expect(await f.evaluate(() => (window as any).writes)).toBeGreaterThan(10); // the player did keep writing 1x
      expect(m.real).toBeGreaterThan(9.5);
      expect(m.pace).toBeGreaterThan(2.45);
      expect(m.offFrames).toBe(0); // no frame at 1x, not even for < 250 ms after pause/play
      expect(await f.evaluate(() => (document.getElementById('v') as HTMLMediaElement).playbackRate)).toBe(2.6);
    });
  }

  const overlayXY = (f: Frame | Page) =>
    f.locator('[data-speedup-overlay]').evaluate((h) => {
      const x = h.getAttribute('data-x');
      const y = h.getAttribute('data-y');
      return { x: x === null ? NaN : Number(x), y: y === null ? NaN : Number(y) };
    });

  test('Echo360: the badge appears on screen (real <video> off screen), with the remembered speed and with D/S', async ({ context, sw, origin }) => {
    await sw.evaluate(() => chrome.storage.local.set({ defaultSpeed: 2.6, rememberSpeed: true }));
    await serveAs(context, ECHO360, origin);
    const page = await context.newPage();
    await page.goto(`${ECHO360}/echo360-live.html`);
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
    const screen = await page.locator('#screen').boundingBox();
    const onScreen = async () => {
      const { x, y } = await overlayXY(page);
      return x >= screen!.x && x <= screen!.x + screen!.width && y >= screen!.y && y <= screen!.y + screen!.height;
    };

    // The extension applies the remembered speed: the badge shows it when playback starts.
    await page.click('#play');
    await expect.poll(() => overlayVisible(page)).toBe(true);
    expect(await onScreen()).toBe(true);
    await expect.poll(() => page.evaluate(() => (document.getElementById('v') as HTMLMediaElement).playbackRate)).toBe(2.6);

    // D / S: the badge comes back, on screen.
    await page.waitForTimeout(2600);
    expect(await overlayVisible(page)).toBe(false);
    await page.keyboard.press('d');
    await expect.poll(() => overlayVisible(page)).toBe(true);
    expect(await onScreen()).toBe(true);
    await expect.poll(() => page.evaluate(() => (document.getElementById('v') as HTMLMediaElement).playbackRate)).toBe(2.7);
    await page.keyboard.press('s');
    await expect.poll(() => page.evaluate(() => (document.getElementById('v') as HTMLMediaElement).playbackRate)).toBe(2.6);
  });

  test('Panopto: the badge sits top-right of the video, away from the logo (QA 2026-11-16)', async ({ context, sw, origin }) => {
    await serveAs(context, PANOPTO, origin);
    const page = await context.newPage();
    await page.goto(`${PANOPTO}/panopto.html`);
    const f = await playerFrame(page);
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2 }).then((r) => r?.speed)).toBe(2);
    await expect.poll(() => overlayVisible(f)).toBe(true);
    const screen = await f.locator('#screen').boundingBox();
    const { x, y } = await overlayXY(f);
    expect(x).toBeGreaterThan(screen!.x + screen!.width / 2); // right half
    expect(y).toBeLessThan(screen!.y + screen!.height / 2); // top half
  });

  test('skip silence (Beta) never starts on lecture platforms, even when enabled', async ({ context, sw, origin }) => {
    const ss = { enabled: true, thresholdDb: -42, minSilenceMs: 300, silenceSpeed: 4, minSpeechMs: 200 };
    await setPro(sw, { skipSilence: ss });
    await serveAs(context, PANOPTO, origin);
    const page = await context.newPage();
    await page.goto(`${PANOPTO}/silence.html`);
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
    await page.locator('#a').evaluate((a: HTMLAudioElement) => a.play());
    await page.waitForTimeout(3000);
    expect((await sendToTabs(sw, { action: 'GET_VIDEO_STATUS' })).skipSilence).toBeUndefined();
    expect(await page.evaluate(() => (window as any).rates as number[])).not.toContain(4);
  });
});
