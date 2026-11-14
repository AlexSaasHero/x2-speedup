// Live QA on recorded-lecture platforms (Panopto, Echo360): public recordings, no login.
// Release criteria for v1.9.0 (docs/QA.md §0b), at 1.5x, 2x, 2.5x and 3x:
//   - the lecture starts at the remembered speed;
//   - real pace within ±10% of the speed for 2 minutes of continuous playback;
//   - kept after seek, pause/play, click on the video, D/S shortcuts;
//   - Echo360: also the next lecture.
// Run on demand (one test per platform and speed, ~1 hour in total):
//   python3 -m http.server 8001 --directory tests/live/fixtures   # LMS-like page for the iframe case
//   PW_EXECUTABLE="<Chrome for Testing binary>" npm run qa:live -- tests/live/lectures.spec.ts
// PW_EXECUTABLE is required: these players stream H.264, which Playwright's Chromium cannot decode.
// Results are printed as `QA {json}` lines.
import type { Frame, Page } from '@playwright/test';
import { expect, sendToTabs, test } from '../e2e/harness';

const PANOPTO_HOWTO = 'https://howtovideos.hosted.panopto.com/Panopto/Pages';
const HOWTO_ID = '2f9b4aff-7835-4534-9008-b11e0142c544';
const LMS = process.env.QA_LMS_ORIGIN ?? 'http://localhost:8001';
const ECHO360_SECTION = 'https://echo360.org/section/5e1d12d0-7476-404f-a839-d0f9d1c62f8e/public';
/** Long recordings (webinars): the short "Getting Started" videos end within a minute at 3x. */
const ECHO360_GROUP = 'Hear From Your Peers Webinar Series';
const SPEEDS = (process.env.QA_SPEEDS ?? '1.5,2,2.5,3').split(',').map(Number);
const SUSTAIN_MS = Number(process.env.QA_SUSTAIN_MS ?? 120_000);
const TOLERANCE = 0.1;

type Target = { name: string; open: (page: Page) => Promise<void>; next?: (page: Page) => Promise<void>; playerButtons?: boolean };

async function clickCenter(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height, 540) / 2);
}

const echoPlay = (page: Page) => page.locator('#player-controls-play, button[aria-label="Play"]').first();
const echoPause = (page: Page) => page.locator('#player-controls-pause, button[aria-label="Pause"]').first();

async function openEcho360Lesson(page: Page, index: number) {
  await page.goto(ECHO360_SECTION, { waitUntil: 'domcontentloaded' });
  await page.locator('.class-row.group', { hasText: ECHO360_GROUP }).locator('button.opener').click({ timeout: 30_000 });
  await page.locator('.class-row:not(.group)').nth(index).locator('header').click();
  await page.waitForURL(/\/lesson\/.+\/classroom/, { timeout: 30_000 });
  // Start like a student does: with the player's own Play button (disabled while it loads).
  const playing = () => page.evaluate(() => [...document.querySelectorAll('video')].some((v) => !v.paused));
  await expect.poll(async () => (await playing()) || (await echoPlay(page).isEnabled().catch(() => false)), { timeout: 60_000 }).toBe(true);
  if (!(await playing())) {
    await echoPlay(page).click({ timeout: 10_000 }).catch(async () => {
      const box = await page.locator('video').first().boundingBox();
      if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    });
  }
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
    next: (page) => openEcho360Lesson(page, 1),
    playerButtons: true
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

type V = { rate: number; t: number; paused: boolean; dur: number };
const videos = (f: Frame): Promise<V[]> =>
  f.evaluate(() =>
    [...document.querySelectorAll('video')]
      .filter((v) => v.readyState > 0)
      .map((v) => ({ rate: v.playbackRate, t: v.currentTime, paused: v.paused, dur: v.duration || 0 }))
  );
const rates = async (f: Frame) => (await videos(f)).map((v) => v.rate);
const playAll = (f: Frame) => f.evaluate(() => Promise.all([...document.querySelectorAll('video')].map((v) => { v.muted = true; return v.play().catch(() => {}); })));
const anyPlaying = async (f: Frame) => (await videos(f)).some((v) => !v.paused);

/**
 * Real pace over `ms`, in windows of `windowMs`. Per window: the smallest advance among streams
 * playing at both ends (Panopto re-syncs its secondary stream with forward jumps; the slowest
 * stream is the lecture's pace). Windows where nothing played count as 0 (a stall is a failure).
 */
async function pace(page: Page, f: Frame, ms: number, windowMs = 10_000) {
  const windows: number[] = [];
  let prev = await videos(f);
  let tPrev = Date.now();
  for (let elapsed = 0; elapsed < ms; elapsed += windowMs) {
    await page.waitForTimeout(Math.min(windowMs, ms - elapsed));
    const cur = await videos(f);
    const now = Date.now();
    const adv = cur
      .map((v, i) => (prev[i] && !v.paused && !prev[i].paused && v.t > prev[i].t ? v.t - prev[i].t : NaN))
      .filter((x) => Number.isFinite(x));
    windows.push(adv.length ? Math.min(...adv) / ((now - tPrev) / 1000) : 0);
    prev = cur;
    tPrev = now;
  }
  const overall = windows.reduce((a, b) => a + b, 0) / windows.length;
  return { overall: Math.round(overall * 100) / 100, windows: windows.map((w) => Math.round(w * 100) / 100) };
}
const within = (x: number, speed: number) => Math.abs(x - speed) <= speed * TOLERANCE;

for (const target of TARGETS) {
  for (const speed of SPEEDS) {
    test(`${target.name} @ ${speed}x: release criteria`, async ({ context, sw }) => {
      test.setTimeout(SUSTAIN_MS + 360_000);
      const page = await context.newPage();
      const log: Record<string, unknown> = { target: target.name, speed };
      const check = (name: string, ok: boolean, detail: unknown) => {
        log[name] = { ok, detail };
        expect.soft(ok, `${name}: ${JSON.stringify(detail)}`).toBe(true);
      };
      const allAt = async (f: Frame, want: number) => (await rates(f)).every((r) => Math.abs(r - want) < 0.01);

      // Opening: the remembered speed, with no action from the user.
      await sw.evaluate((s) => chrome.storage.local.set({ defaultSpeed: s, rememberSpeed: true }), speed);
      await target.open(page);
      const f = await mediaFrame(page);
      if (!target.playerButtons) await playAll(f);
      await page.waitForTimeout(4000);
      check('open at remembered speed', await allAt(f, speed), await rates(f));

      // 2 minutes of continuous playback.
      await sendToTabs(sw, { action: 'SET_SPEED', speed });
      const sustained = await pace(page, f, SUSTAIN_MS);
      check('2 min pace ±10%', within(sustained.overall, speed), { ...sustained, rates: await rates(f) });

      // After each action: the speed is unchanged and the lecture keeps its pace.
      const after = async (name: string) => {
        await page.waitForTimeout(2000);
        if (!(await anyPlaying(f))) {
          if (target.playerButtons) await echoPlay(page).click().catch(() => {});
          else await playAll(f);
          await page.waitForTimeout(1500);
        }
        const r = await rates(f);
        const p = await pace(page, f, 6000, 6000);
        check(name, r.every((x) => Math.abs(x - speed) < 0.01) && within(p.overall, speed), { rates: r, pace: p.overall });
      };

      await f.evaluate(() => {
        const v = [...document.querySelectorAll('video')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
        v.currentTime = Math.min(60, (v.duration || 120) / 3);
      });
      await after('seek');

      if (target.playerButtons) {
        await echoPause(page).click();
        await page.waitForTimeout(1500);
        await echoPlay(page).click();
      } else {
        await f.evaluate(() => document.querySelectorAll('video').forEach((v) => v.pause()));
        await page.waitForTimeout(1500);
        await playAll(f);
      }
      await after('pause/play');

      const box = await f.locator('video').last().boundingBox().catch(() => null);
      if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await after('click on video');

      await page.keyboard.press('d');
      await page.waitForTimeout(1500);
      const afterD = await rates(f);
      await page.keyboard.press('s');
      await after('D then S');
      log['D step'] = { ok: afterD.every((x) => Math.abs(x - (speed + 0.1)) < 0.01), detail: afterD };
      expect.soft(afterD.every((x) => Math.abs(x - (speed + 0.1)) < 0.01), `D step: ${JSON.stringify(afterD)}`).toBe(true);

      if (target.next) {
        await target.next(page);
        const f2 = await mediaFrame(page);
        await page.waitForTimeout(4000);
        const r = await rates(f2);
        const p = await pace(page, f2, 10_000, 10_000);
        check('next lecture', r.every((x) => Math.abs(x - speed) < 0.01) && within(p.overall, speed), { rates: r, pace: p.overall, url: page.url() });
      }

      console.log('QA ' + JSON.stringify(log));
    });
  }
}

// Panopto Embed at 16x: what the player does (not a release criterion).
test('Panopto Embed in LMS iframe @ 16x: what happens', async ({ context, sw }) => {
  test.setTimeout(180_000);
  const page = await context.newPage();
  await TARGETS[2].open(page);
  const f = await mediaFrame(page);
  await playAll(f);
  await f.evaluate(() => {
    const w = window as unknown as { __ev: string[]; __t0: number };
    w.__ev = [];
    w.__t0 = performance.now();
    for (const v of document.querySelectorAll('video'))
      for (const type of ['waiting', 'stalled', 'ratechange', 'pause', 'seeking', 'emptied', 'error'])
        v.addEventListener(type, () => w.__ev.push(`${Math.round(performance.now() - w.__t0)}ms ${v.clientWidth}px ${type} rate=${v.playbackRate} rs=${v.readyState}`));
  });
  await sendToTabs(sw, { action: 'SET_SPEED', speed: 16 });
  const samples: unknown[] = [];
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    samples.push((await videos(f)).map((v) => `${v.rate}x t=${Math.round(v.t)} ${v.paused ? 'paused' : 'playing'}`));
  }
  const events = await f.evaluate(() => (window as unknown as { __ev: string[] }).__ev.slice(0, 60));
  console.log('QA16 ' + JSON.stringify({ samples, events }));
});
