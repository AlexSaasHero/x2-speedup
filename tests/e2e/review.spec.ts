import type { Worker } from '@playwright/test';
import { CWS_REVIEWS_URL } from '../../src/shared/links';
import { expect, test } from './harness';

const DAY = 24 * 60 * 60 * 1000;
const H = 3600;

/** Installed `days` ago, with `hours` saved in total (no network: everything in storage.local). */
async function seed(sw: Worker, days: number, hours: number, reviewPrompt?: unknown): Promise<void> {
  await sw.evaluate(
    ({ installDate, saved, reviewPrompt }) =>
      chrome.storage.local.set({
        installDate,
        timeSaved: { version: 1, days: {}, total: { saved, watched: saved } },
        ...(reviewPrompt ? { reviewPrompt } : {})
      }),
    { installDate: Date.now() - days * DAY, saved: hours * H, reviewPrompt }
  );
}

const reviewPrompt = (sw: Worker) => sw.evaluate(() => chrome.storage.local.get('reviewPrompt').then((r) => r.reviewPrompt));

test('review banner: hidden before 3 h saved or 5 days installed', async ({ context, sw, extensionId }) => {
  const page = await context.newPage();
  for (const [days, hours] of [[6, 2.9], [4.9, 10]]) {
    await seed(sw, days, hours);
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await expect(page.locator('#tierBadgeText')).toHaveText('Free'); // popup initialised
    await expect(page.locator('#reviewBanner')).toBeHidden();
  }
});

test('review banner: "Not now" twice, then never again', async ({ context, sw, extensionId }) => {
  const page = await context.newPage();
  const popup = `chrome-extension://${extensionId}/popup/popup.html`;
  await seed(sw, 6, 4.5);
  await page.goto(popup);
  await expect(page.locator('#reviewBanner')).toBeVisible();
  await expect(page.locator('#reviewText')).toHaveText("You've saved 4 hours with LectureSpeed. A quick review helps other students find it.");
  await expect(page.locator('#reviewRate')).toHaveText('Leave a review');

  await page.locator('#reviewLater').click();
  await expect(page.locator('#reviewBanner')).toBeHidden();
  await expect.poll(() => reviewPrompt(sw).then((p) => p.dismissals)).toBe(1);
  await page.reload();
  await expect(page.locator('#tierBadgeText')).toHaveText('Free');
  await expect(page.locator('#reviewBanner')).toBeHidden(); // snoozed for 14 days

  // 14 days later: back once more.
  await seed(sw, 20, 6, { state: 'waiting', snoozedUntil: Date.now() - 1, dismissals: 1 });
  await page.reload();
  await expect(page.locator('#reviewBanner')).toBeVisible();
  await page.locator('#reviewLater').click();
  await expect.poll(() => reviewPrompt(sw).then((p) => p.dismissals)).toBe(2);

  // Even after the snooze has expired, a third time never comes.
  await seed(sw, 40, 20, { state: 'waiting', snoozedUntil: Date.now() - 1, dismissals: 2 });
  await page.reload();
  await expect(page.locator('#tierBadgeText')).toHaveText('Free');
  await expect(page.locator('#reviewBanner')).toBeHidden();
});

test('review banner: "Leave a review" opens the Store reviews and never comes back', async ({ context, sw, extensionId }) => {
  const page = await context.newPage();
  await context.route(/chromewebstore\.google\.com/, (route) => route.fulfill({ body: 'store' })); // no real network in tests
  await seed(sw, 6, 3);
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await expect(page.locator('#reviewBanner')).toBeVisible();
  const [store] = await Promise.all([context.waitForEvent('page'), page.locator('#reviewRate').click()]);
  await expect.poll(() => store.url()).toContain(CWS_REVIEWS_URL);
  await store.close();
  await expect.poll(() => reviewPrompt(sw).then((p) => p.state)).toBe('done');

  await seed(sw, 400, 500);
  await page.reload();
  await expect(page.locator('#tierBadgeText')).toHaveText('Free');
  await expect(page.locator('#reviewBanner')).toBeHidden();
  await context.unroute(/chromewebstore\.google\.com/);
});
