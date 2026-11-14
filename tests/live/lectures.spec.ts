// Live QA on recorded-lecture platforms (Panopto, Echo360), public recordings, no login.
// Mirrors the Panopto / Echo360 columns of docs/QA.md. Run on demand:
//   PW_EXECUTABLE="<Chrome for Testing binary>" npm run qa:live -- tests/live/lectures.spec.ts
// PW_EXECUTABLE is required: these players stream H.264, which Playwright's Chromium cannot decode.
// The "LMS" targets embed Panopto in an <iframe> on a local page (Canvas/Moodle-like): serve
// tests/live/fixtures/ with `python3 -m http.server 8001 --directory tests/live/fixtures`.
import type { Frame, Page } from '@playwright/test';
import { expect, sendToTabs, test } from '../e2e/harness';

const PANOPTO_HOWTO = 'https://howtovideos.hosted.panopto.com/Panopto/Pages';
const HOWTO_ID = '2f9b4aff-7835-4534-9008-b11e0142c544';
const LMS = process.env.QA_LMS_ORIGIN ?? 'http://localhost:8001';
const ECHO360_SECTION = 'https://echo360.org/section/5e1d12d0-7476-404f-a839-d0f9d1c62f8e/public';

type Target = { name: string; open: (page: Page) => Promise<void>; next?: (page: Page) => Promise<void> };

async function clickCenter(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height, 540) / 2);
}

async function openEcho360Lesson(page: Page, index: number) {
  await page.goto(ECHO360_SECTION, { waitUntil: 'domcontentloaded' });
  await page.locator('.class-row.group button.opener').first().click({ timeout: 30_000 });
  await page.locator('.class-row:not(.group)').nth(index).locator('header').click();
  await page.waitForURL(/\/lesson\/.+\/classroom/, { timeout: 30_000 });
  // Start like a student does: with the player's own Play button (programmatic play() hides BUGS #23).
  await page.locator('#player-controls-play, button[aria-label="Play"]').first().click({ timeout: 30_000 });
}

const TARGETS: Target[] = [
  {
    name: 'Panopto Viewer',
    open: async (page) => {
      await page.goto(`${PANOPTO_HOWTO}/Viewer.aspx?id=${HOWTO_ID}`, { waitUntil: 'domcontentloaded' });
    }
  },
  {
    name: 'Panopto Embed',
    open: async (page) => {
      await page.goto(`${PANOPTO_HOWTO}/Embed.aspx?id=${HOWTO_ID}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(8000);
      await clickCenter(page, 'body');
    }
  },
  {
    name: 'Panopto Embed in LMS iframe',
    open: async (page) => {
      await page.goto(`${LMS}/lms.html?src=${encodeURIComponent(`${PANOPTO_HOWTO}/Embed.aspx?id=${HOWTO_ID}`)}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(8000);
      await clickCenter(page, '#lecture');
    }
  },
  {
    name: 'Echo360',
    open: (page) => openEcho360Lesson(page, 0),
    next: (page) => openEcho360Lesson(page, 3)
  }
];

/** Frame that holds the lecture videos (top page or the embedded player). */
async function mediaFrame(page: Page): Promise<Frame> {
  let found: Frame | null = null;
  await expect
    .poll(
      async () => {
        for (const f of page.frames()) {
          const n = await f.evaluate(() => [...document.querySelectorAll('video')].filter((v) => v.readyState > 0).length).catch(() => 0);
          if (n > 0) return !!(found = f);
        }
        return false;
      },
      { timeout: 60_000, intervals: [1000] }
    )
    .toBe(true);
  return found!;
}

const videos = (f: Frame) =>
  f.evaluate(() =>
    [...document.querySelectorAll('video')]
      .filter((v) => v.readyState > 0)
      .map((v) => ({ rate: v.playbackRate, t: Math.round(v.currentTime * 10) / 10, paused: v.paused, size: v.clientWidth * v.clientHeight }))
  );
const rates = async (f: Frame) => (await videos(f)).map((v) => v.rate);
const playAll = (f: Frame) => f.evaluate(() => Promise.all([...document.querySelectorAll('video')].map((v) => { v.muted = true; return v.play().catch(() => {}); })));
const status = (sw: Parameters<typeof sendToTabs>[0]) => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' });

/**
 * Seconds of lecture per real second over `ms`, for streams playing at both samples. Panopto
 * re-syncs its streams with jumps, so the slowest playing stream is the lecture's real pace.
 */
async function effectiveSpeed(page: Page, f: Frame, ms = 8000): Promise<{ slowest: number; streams: number[] }> {
  const a = await videos(f);
  const t0 = Date.now();
  await page.waitForTimeout(ms);
  const b = await videos(f);
  const dt = (Date.now() - t0) / 1000;
  const streams = b.map((v, i) => (v.paused || a[i]?.paused ? NaN : Math.round(((v.t - a[i].t) / dt) * 100) / 100));
  const playing = streams.filter((x) => Number.isFinite(x));
  return { slowest: playing.length ? Math.min(...playing) : 0, streams };
}

for (const target of TARGETS) {
  test(`${target.name}: speed, persistence, sync, shortcuts, overlay`, async ({ context, sw }) => {
    test.setTimeout(300_000);
    const page = await context.newPage();
    const log: Record<string, unknown> = { target: target.name };
    const check = (name: string, ok: boolean, detail: unknown) => {
      log[name] = { ok, detail };
      expect.soft(ok, `${name}: ${JSON.stringify(detail)}`).toBe(true);
    };

    await target.open(page);
    const f = await mediaFrame(page);
    await playAll(f);
    await page.waitForTimeout(3000);
    const st = await status(sw);
    log.frame = f === page.mainFrame() ? 'top' : 'iframe ' + f.url().slice(0, 60);
    check('1 detected', !!st?.hasVideo, { count: st?.count, videos: await videos(f) });

    // 2 popup speed (same message as the popup slider)
    await sendToTabs(sw, { action: 'SET_SPEED', speed: 2.5 });
    await page.waitForTimeout(3000);
    let r = await rates(f);
    check('2 popup 2.5x on every video', r.every((x) => x === 2.5), r);
    const eff = await effectiveSpeed(page, f);
    check('2b lecture really advances at ~2.5x', eff.slowest >= 2.2, eff);

    // 3 two synced streams stay together at speed
    const v0 = await videos(f);
    if (v0.length > 1) {
      await page.waitForTimeout(10_000);
      const v1 = await videos(f);
      const drift = Math.abs((v1[0].t - v1[1].t) - (v0[0].t - v0[1].t));
      check('3 streams in sync after 10s', drift < 1.5, { before: v0, after: v1, drift });
    }

    // 4 16x
    await sendToTabs(sw, { action: 'SET_SPEED', speed: 16 });
    await page.waitForTimeout(3000);
    r = await rates(f);
    check('4 16x', r.every((x) => x === 16), r);
    await sendToTabs(sw, { action: 'SET_SPEED', speed: 2.5 });
    await page.waitForTimeout(1500);

    // 5 pause / play
    await f.evaluate(() => document.querySelectorAll('video').forEach((v) => v.pause()));
    await page.waitForTimeout(1500);
    await playAll(f);
    await page.waitForTimeout(3000);
    r = await rates(f);
    check('5 kept after pause/play', r.every((x) => x === 2.5), r);

    // 6 seek (+30 s on the largest stream, as the player's timeline would)
    await f.evaluate(() => {
      const v = [...document.querySelectorAll('video')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
      v.currentTime = Math.min(v.currentTime + 30, (v.duration || 60) - 5);
    });
    await page.waitForTimeout(4000);
    r = await rates(f);
    check('6 kept after seek', r.every((x) => x === 2.5), r);

    // 7 player resets the rate on its own (no user gesture) → re-applied
    await f.evaluate(() => document.querySelectorAll('video').forEach((v) => (v.playbackRate = 1)));
    await page.waitForTimeout(2000);
    r = await rates(f);
    check('7 player reset to 1x is undone', r.every((x) => x === 2.5), r);

    // 8 does the player itself pull the speed back (≤2x) while playing? sample 15 s
    const samples: number[][] = [];
    for (let i = 0; i < 15; i++) {
      samples.push(await rates(f));
      await page.waitForTimeout(1000);
    }
    const min = Math.min(...samples.flat());
    check('8 no player clamp over 15s', min === 2.5, { min, last: samples.at(-1) });

    // 9 keyboard shortcut inside the player frame
    const before = (await status(sw))?.currentSpeed;
    const vbox = await f.locator('video').last().boundingBox().catch(() => null);
    // Focus the player frame without toggling playback: click near the top-left corner of the video.
    if (vbox) await page.mouse.click(vbox.x + 20, vbox.y + 20).catch(() => {});
    await page.waitForTimeout(500);
    await playAll(f);
    await page.keyboard.press('d');
    await page.waitForTimeout(1500);
    r = await rates(f);
    check('9 shortcut D', r.some((x) => Math.abs(x - 2.6) < 0.01), { before, after: r });

    // 10 overlay is shown and lives inside the fullscreen element
    const fs = await f
      .evaluate(async () => {
        const v = [...document.querySelectorAll('video')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
        // Like the player's own fullscreen button: a container around the video, never the <video>.
        let box = v.parentElement!;
        while (box.parentElement && box.parentElement !== document.body && box.clientWidth < v.clientWidth) box = box.parentElement;
        try {
          await box.requestFullscreen();
        } catch (e) {
          return { error: String(e).slice(0, 80) };
        }
        return { fullscreen: !!document.fullscreenElement };
      })
      .catch((e) => ({ error: String(e).slice(0, 80) }));
    await page.keyboard.press('s');
    await page.waitForTimeout(400);
    const ov = await f.evaluate(() => {
      const host = document.querySelector('[data-speedup-overlay]');
      const fsEl = document.fullscreenElement;
      return { overlay: !!host, inFullscreen: !!(host && fsEl && (fsEl.contains(host) || fsEl.shadowRoot?.contains(host))), fsTag: fsEl?.tagName ?? null };
    });
    check('10 overlay in fullscreen', ov.overlay && ov.inFullscreen, { ...fs, ...ov });
    await f.evaluate(() => document.fullscreenElement && document.exitFullscreen()).catch(() => {});

    // 11 typing in the LMS page does not trigger shortcuts
    if (await page.locator('#notes').count()) {
      const r0 = await rates(f);
      await page.click('#notes');
      await page.keyboard.type('dddd');
      await page.waitForTimeout(800);
      r = await rates(f);
      check('11 typing in LMS notes ignored', JSON.stringify(r) === JSON.stringify(r0) && (await page.inputValue('#notes')) === 'dddd', { r0, r });
    }

    // 13-15 Echo360's own controls (BUGS #23)
    if (target.name === 'Echo360') {
      await sendToTabs(sw, { action: 'SET_SPEED', speed: 2.5 });
      await page.waitForTimeout(1000);
      const playBtn = page.locator('#player-controls-pause, #player-controls-play, button[aria-label="Play"], button[aria-label="Pause"]').first();
      await playBtn.click(); // pause
      await page.waitForTimeout(1500);
      await playBtn.click(); // play
      await page.waitForTimeout(3000);
      r = await rates(f);
      const e13 = await effectiveSpeed(page, f, 6000);
      check('13 Echo360 Pause/Play button keeps the speed', r.every((x) => x === 2.5) && e13.slowest >= 2.2, { rates: r, effective: e13 });
      // focus stays on the player's Play button
      await page.keyboard.press('d');
      await page.waitForTimeout(2000);
      r = await rates(f);
      check('14 D with focus on Echo360 Play button', r.every((x) => Math.abs(x - 2.6) < 0.01), { rates: r, focus: await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName) });
      // the player's own speed menu, without pressing Play
      await page.getByRole('button', { name: /playback speed/i }).first().click().catch(() => {});
      await page.waitForTimeout(800);
      const item = page.getByRole('menuitemradio', { name: /^1\.5/ }).or(page.getByRole('menuitem', { name: /^1\.5/ })).or(page.getByRole('option', { name: /^1\.5/ })).or(page.getByText(/^1\.5x?$/)).first();
      const found = await item.count();
      if (found) await item.click().catch(() => {});
      await page.waitForTimeout(4000);
      r = await rates(f);
      check('15 Echo360 speed menu choice (1.5x) respected', found > 0 && r.every((x) => x === 1.5), { menuItemFound: found, rates: r, ext: (await status(sw))?.currentSpeed });
    }

    // 12 next lecture starts at the remembered speed
    if (target.next) {
      await sendToTabs(sw, { action: 'SET_SPEED', speed: 2.5 });
      await page.waitForTimeout(1500);
      const remembered = (await status(sw))?.currentSpeed;
      await target.next(page);
      const f2 = await mediaFrame(page);
      await playAll(f2);
      await page.waitForTimeout(4000);
      r = await rates(f2);
      check('12 next lecture at remembered speed', remembered === 2.5 && r.length > 0 && r.every((x) => x === remembered), { remembered, rates: r, url: page.url() });
    }

    console.log('QA ' + JSON.stringify(log));
  });
}
