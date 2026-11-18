// The extension is disabled or updated while a lecture is open: Chrome keeps the old content script
// running without chrome.runtime ("orphaned"). It must release the media so the page-world rate guard
// lets the player set its speed again. Own browser: reloading the extension would break the shared one.
import path from 'node:path';
import { chromium } from '@playwright/test';
import { expect, sendToTabs, test, waitForMigration } from './harness';

const ECHO360 = 'https://test.echo360.org';
const dist = path.resolve('dist');

test('orphaned content script (extension disabled/updated) releases the player', async ({ origin }) => {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--autoplay-policy=no-user-gesture-required']
  });
  try {
    await context.route(/x2-speedup\.vercel\.app|lecturespeed\.vercel\.app|lemonsqueezy\.com/, (route) => route.abort());
    await context.route(`${ECHO360}/**`, async (route) => {
      const url = new URL(route.request().url());
      await route.fulfill({ response: await route.fetch({ url: origin + url.pathname + url.search }) });
    });
    const isOurs = (w: { url(): string }) => /\/background\/background\.js$/.test(w.url());
    const sw = context.serviceWorkers().find(isOurs) ?? (await context.waitForEvent('serviceworker', { predicate: isOurs }));
    await expect.poll(() => sw.evaluate(() => typeof chrome !== 'undefined' && !!chrome.storage)).toBe(true);
    await waitForMigration(sw);

    const page = await context.newPage();
    await page.goto(`${ECHO360}/echo360.html`);
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
    await page.click('#play');
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 2 }).then((r) => r?.speed)).toBe(2);
    const v = () => page.evaluate(() => {
      const el = document.getElementById('v') as HTMLMediaElement;
      return { rate: el.playbackRate, attr: el.getAttribute('data-lecturespeed-rate') };
    });
    await expect.poll(v).toEqual({ rate: 2, attr: '2' });

    // "Disable/update": the extension restarts, the content script in this page is orphaned.
    await sw.evaluate(() => chrome.runtime.reload()).catch(() => {});
    await expect.poll(() => v().then((x) => x.attr), { timeout: 8000 }).toBeNull();
    await page.click('#speed-1-5');
    await expect.poll(() => v().then((x) => x.rate)).toBe(1.5);
    await page.waitForTimeout(1500); // the player keeps writing 1.5 and nobody fights it
    expect((await v()).rate).toBe(1.5);
  } finally {
    await context.close();
  }
});
