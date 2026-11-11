// Live QA on YouTube (public video, no login). Mirrors docs/QA.md §1 for the YouTube column.
import type { Page } from '@playwright/test';
import { expect, proLicense, sendToTabs, test } from '../e2e/harness';

// Blender Foundation, "Big Buck Bunny 60fps 4K" — long-lived public video.
const VIDEO = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';

const rate = (p: Page) => p.evaluate(() => document.querySelector<HTMLVideoElement>('#movie_player video')?.playbackRate ?? null);
const time = (p: Page) => p.evaluate(() => document.querySelector<HTMLVideoElement>('#movie_player video')?.currentTime ?? 0);
const inAd = (p: Page) => p.evaluate(() => !!document.querySelector('#movie_player.ad-showing, #movie_player.ad-interrupting'));

/** Open the video, refuse optional cookies if the consent page appears, wait for playback. */
async function openVideo(page: Page) {
  await page.goto(VIDEO, { waitUntil: 'domcontentloaded' });
  if (/consent\.(youtube|google)\./.test(page.url())) {
    // Privacy-preserving choice on the consent screen.
    await page.getByRole('button', { name: /reject all|rifiuta tutto/i }).first().click();
    await page.waitForURL(/youtube\.com\/watch/);
  }
  await page.waitForSelector('#movie_player video', { timeout: 60_000 });
  await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>('#movie_player video')!;
    v.muted = true;
    void v.play().catch(() => {});
  });
  await expect.poll(() => page.evaluate(() => (document.querySelector('#movie_player video') as HTMLVideoElement).readyState), { timeout: 60_000 }).toBeGreaterThan(1);
}

async function waitAdsOut(page: Page) {
  await expect.poll(() => inAd(page), { timeout: 120_000, intervals: [2000] }).toBe(false);
}

// License servers stay blocked (harness default): a Pro license then runs on its grace period.

test('A/B/C/F/H — shortcuts, seek, overlay, typing in search, remembered speed', async ({ context, sw }) => {
  const page = await context.newPage();
  await openVideo(page);
  await waitAdsOut(page);
  await page.click('#movie_player', { position: { x: 200, y: 150 }, timeout: 5000 }).catch(() => {});
  await page.evaluate(() => (document.querySelector('#movie_player video') as HTMLVideoElement).play());

  // A: shortcuts
  await page.keyboard.press('d');
  await expect.poll(() => rate(page)).toBe(1.1);
  await page.keyboard.press('s');
  await page.keyboard.press('g');
  await expect.poll(() => rate(page)).toBe(2);

  // >2x is enforced against YouTube's own 2x clamp
  await sendToTabs(sw, { action: 'SET_SPEED', speed: 3 });
  await expect.poll(() => rate(page)).toBe(3);

  // C: overlay host exists, does not block clicks
  await expect(page.locator('[data-speedup-overlay]')).toHaveCount(1);

  // B: seek +10 s
  await page.evaluate(() => (document.querySelector('#movie_player video') as HTMLVideoElement).pause());
  const t0 = await time(page);
  await page.keyboard.press('x');
  await expect.poll(async () => (await time(page)) - t0, { timeout: 15_000 }).toBeGreaterThan(8);
  await page.evaluate(() => (document.querySelector('#movie_player video') as HTMLVideoElement).play());

  // H: typing in the search box is untouched
  await page.click('input[name="search_query"], input#search');
  await page.keyboard.type('sdrzxv');
  await expect(page.locator('input[name="search_query"], input#search').first()).toHaveValue('sdrzxv');
  expect(await rate(page)).toBe(3);
  await page.keyboard.press('Escape');

  // F: a new page load of a video starts at the remembered speed
  await page.goto('about:blank');
  await openVideo(page);
  await waitAdsOut(page);
  await expect.poll(() => rate(page), { timeout: 20_000 }).toBe(3);
});

test('G — speed changed with YouTube\'s own shortcut (Shift+.) is respected', async ({ context }) => {
  const page = await context.newPage();
  await openVideo(page);
  await waitAdsOut(page);
  // No click on the player: YouTube's shortcuts work with focus anywhere on the page.
  await page.waitForTimeout(6000); // let the player settle (post-load window + YouTube init)
  const playerRate = () => page.evaluate(() => (document.querySelector('#movie_player') as any).getPlaybackRate?.());
  await page.keyboard.press('Shift+Period');
  await expect.poll(playerRate, { timeout: 10_000 }).toBe(1.25); // YouTube received the key
  await page.waitForTimeout(2000);
  expect(await rate(page)).toBe(1.25); // …and the extension kept YouTube's choice
});

test('E — fullscreen keeps the overlay and shortcuts', async ({ context }) => {
  const page = await context.newPage();
  await openVideo(page);
  await waitAdsOut(page);
  await page.click('#movie_player', { position: { x: 200, y: 150 }, timeout: 5000 }).catch(() => {});
  await page.keyboard.press('f');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.keyboard.press('d');
  await expect.poll(() => rate(page)).toBe(1.1);
  await expect
    .poll(() => page.locator('[data-speedup-overlay]').evaluate((h) => !!document.fullscreenElement?.contains(h)))
    .toBe(true);
});

test('Pro — channel detected for rules, channel rule applied', async ({ context, sw }) => {
  await sw.evaluate((l) => chrome.storage.local.set({ license: l }), proLicense());
  const page = await context.newPage();
  await openVideo(page);
  await waitAdsOut(page);
  const ctx = await expect.poll(() => sendToTabs(sw, { action: 'GET_PAGE_CONTEXT' }).then((r) => r?.channel ?? null), { timeout: 15_000 }).not.toBeNull();
  void ctx;
  const page2 = await sendToTabs(sw, { action: 'GET_PAGE_CONTEXT' });
  console.log('channel detected:', JSON.stringify(page2.channel));
  const pattern = page2.channel.handle ?? page2.channel.id ?? page2.channel.name;
  await sw.evaluate((p) => chrome.storage.local.set({ rules: [{ id: 'c', type: 'channel', pattern: p, speed: 1.75 }] }), pattern);
  await expect.poll(() => rate(page), { timeout: 15_000 }).toBe(1.75);
});

test('Pro — ads at 16x muted, then restored (only if YouTube serves an ad)', async ({ context, sw }) => {
  await sw.evaluate((l) => chrome.storage.local.set({ license: l, youtubeAds: true, defaultSpeed: 1.5 }), proLicense());
  const page = await context.newPage();
  await page.goto(VIDEO, { waitUntil: 'domcontentloaded' });
  if (/consent\./.test(page.url())) {
    await page.getByRole('button', { name: /reject all|rifiuta tutto/i }).first().click();
  }
  await page.waitForSelector('#movie_player video', { timeout: 60_000 });
  const sawAd = await expect
    .poll(() => inAd(page), { timeout: 15_000 })
    .toBe(true)
    .then(() => true, () => false);
  test.skip(!sawAd, 'YouTube served no ad this time');
  await expect.poll(() => rate(page)).toBe(16);
  expect(await page.evaluate(() => (document.querySelector('#movie_player video') as HTMLVideoElement).muted)).toBe(true);
  await waitAdsOut(page);
  await expect.poll(() => rate(page)).toBe(1.5);
});
