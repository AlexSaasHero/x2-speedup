import { FREE_MAX_SPEED, formatSpeed } from '../../src/config/plans';
import { expect, test, waitForMigration } from './harness';

test('install migrates storage to the current schema without telemetry', async ({ sw }) => {
  const data = await waitForMigration(sw);
  expect(data.schemaVersion).toBe(1);
  expect(data.isPro).toBe(false);
  expect(data.licenseKey).toBe('');
  for (const legacy of ['is_pro', 'license_key', 'isLicensed', 'preservePitch', 'telemetry_client_id']) {
    expect(data).not.toHaveProperty(legacy);
  }
});

test('content script applies stored speed and clamps it to the free limit', async ({ context, sw, origin }) => {
  await waitForMigration(sw);
  const page = await context.newPage();
  await page.goto(`${origin}/basic.html`);
  const rate = () => page.locator('#v').evaluate((v: HTMLVideoElement) => v.playbackRate);

  await sw.evaluate(() => chrome.storage.local.set({ defaultSpeed: 1.5 }));
  await expect.poll(rate).toBe(1.5);

  await sw.evaluate(() => chrome.storage.local.set({ defaultSpeed: 1.75 + 10 }));
  await expect.poll(rate).toBe(FREE_MAX_SPEED);

  await sw.evaluate(() => chrome.storage.local.set({ isPro: true }));
  await sw.evaluate(() => chrome.storage.local.set({ defaultSpeed: 3 }));
  await expect.poll(rate).toBe(3);
});

test('popup renders free tier from plans config with no errors and no telemetry', async ({ context, sw, extensionId }) => {
  await waitForMigration(sw);
  const errors: string[] = [];
  const requests: string[] = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => requests.push(r.url()));

  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await expect(page.locator('#tierBadgeText')).toHaveText(`Free Tier (Max ${formatSpeed(FREE_MAX_SPEED)})`);
  await expect(page.locator('#speedSlider')).toHaveAttribute('max', String(FREE_MAX_SPEED));

  await sw.evaluate(() => chrome.storage.local.set({ isPro: true }));
  await page.reload();
  await expect(page.locator('#tierBadgeText')).toHaveText('Pro Active ✨');

  expect(errors).toEqual([]);
  expect(requests.filter((u) => !u.startsWith('chrome-extension://'))).toEqual([]);
});
