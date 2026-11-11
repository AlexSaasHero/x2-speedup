import { chromium, type Page } from '@playwright/test';
import { expect, rateOf, sendToTabs, test } from './harness';

async function storm(page: Page, origin: string): Promise<number> {
  await page.goto(`${origin}/storm.html`);
  await page.bringToFront();
  return page.evaluate(() => (window as any).runStorm());
}

test('mutation storm: overhead vs. no extension stays small; media still found afterwards', async ({ context, sw, origin }) => {
  test.setTimeout(120_000);
  await sw.evaluate(() => chrome.storage.local.set({ defaultSpeed: 1.5 }));
  const plain = await chromium.launch({ channel: 'chromium' });
  try {
    const basePage = await (await plain.newContext()).newPage();
    const page = await context.newPage();
    // Median of 3 runs each, alternating, to smooth machine noise.
    const withExt: number[] = [];
    const without: number[] = [];
    for (let i = 0; i < 3; i++) {
      without.push(await storm(basePage, origin));
      withExt.push(await storm(page, origin));
    }
    const median = (a: number[]) => [...a].sort((x, y) => x - y)[1];
    console.log(`storm median: with extension ${median(withExt).toFixed(0)} ms, without ${median(without).toFixed(0)} ms`);
    // Guard against regressions to per-mutation document walks (v1.5 re-scanned the whole
    // document on every mutation). Timing on CI machines is noisy, hence the generous bound.
    expect(median(withExt)).toBeLessThan(median(without) * 1.5 + 500);
    await page.evaluate(() => (window as any).addVideo());
    await expect.poll(() => rateOf(page)).toBe(1.5);
  } finally {
    await plain.close();
  }
});

test('frames without media stay dormant: no shortcut handling, no answer to the popup', async ({ context, sw, origin }) => {
  const page = await context.newPage();
  await page.goto(`${origin}/storm.html`);
  await page.keyboard.press('d');
  expect(await sendToTabs(sw, { action: 'GET_VIDEO_STATUS' })).toBeNull();
});

test('nested shadow host added after load is picked up on hover or navigation', async ({ context, sw, origin }) => {
  await sw.evaluate(() => chrome.storage.local.set({ defaultSpeed: 1.5 }));
  const page = await context.newPage();
  await page.goto(`${origin}/shadow.html`);
  await expect.poll(() => page.evaluate(() => (window as any).shadowVideo()?.playbackRate)).toBe(1.5);
  await page.evaluate(() => (window as any).addNested());
  await page.hover('#nested');
  await expect.poll(() => page.evaluate(() => (window as any).nestedVideo().playbackRate)).toBe(1.5);
});
