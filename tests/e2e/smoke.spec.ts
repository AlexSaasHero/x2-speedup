import { readFileSync } from 'node:fs';
import { FREE_MAX_SPEED, PRO_MAX_SPEED, formatSpeed } from '../../src/config/plans';
import { SHORTCUT_ACTIONS } from '../../src/shared/shortcuts';
import { expect, rateOf, sendToTabs, setPro, test } from './harness';

test('manifest declares only the minimal permissions', () => {
  const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
  expect(manifest.permissions).toEqual(['storage', 'activeTab', 'alarms']);
  expect(manifest.host_permissions).toEqual(['https://x2-speedup.vercel.app/*', 'https://api.lemonsqueezy.com/*']);
  expect(manifest.content_scripts[0].css).toBeUndefined();
});

test('popup SET_SPEED is clamped to the free limit, Pro unlocks 16x', async ({ context, sw, origin }) => {
  const page = await context.newPage();
  await page.goto(`${origin}/basic.html`);
  await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo)).toBe(true);

  const res = await sendToTabs(sw, { action: 'SET_SPEED', speed: 10 });
  expect(res.speed).toBe(FREE_MAX_SPEED);
  await expect.poll(() => rateOf(page)).toBe(FREE_MAX_SPEED);

  await setPro(sw);
  await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 99 }).then((r) => r?.speed)).toBe(PRO_MAX_SPEED);
  await expect.poll(() => rateOf(page)).toBe(PRO_MAX_SPEED);
});

test('popup renders free tier from plans config with no errors and no network', async ({ context, sw, extensionId }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => requests.push(r.url()));

  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await expect(page.locator('#tierBadgeText')).toHaveText(`Free Tier (Max ${formatSpeed(FREE_MAX_SPEED)})`);
  await expect(page.locator('#speedSlider')).toHaveAttribute('max', String(FREE_MAX_SPEED));
  await expect(page.locator('#shortcutEditor .hotkey-remap-row')).toHaveCount(SHORTCUT_ACTIONS.length);

  await setPro(sw);
  await page.reload();
  await expect(page.locator('#tierBadgeText')).toHaveText('Pro Active ✨');

  expect(errors).toEqual([]);
  expect(requests.filter((u) => !u.startsWith('chrome-extension://'))).toEqual([]);
});

test('options page loads and saves settings', async ({ context, sw, extensionId }) => {
  const errors: string[] = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`chrome-extension://${extensionId}/options/options.html`);
  await expect(page.locator('#seekSeconds')).toHaveValue('10');
  await page.fill('#seekSeconds', '30');
  await page.locator('#seekSeconds').dispatchEvent('change');
  await page.fill('#shortcutBlacklist', 'https://www.Example.com/x\nfoo.org');
  await page.locator('#shortcutBlacklist').dispatchEvent('change');
  await expect
    .poll(() => sw.evaluate(() => chrome.storage.local.get(['seekSeconds', 'shortcutBlacklist'])))
    .toEqual({ seekSeconds: 30, shortcutBlacklist: ['example.com', 'foo.org'] });

  // Rebind "Faster" to Shift+F via the editor.
  await page.locator('[data-action="faster"] [data-add="faster"]').click();
  await page.keyboard.press('Shift+F');
  const shortcuts = await sw.evaluate(() => chrome.storage.local.get('shortcuts').then((r) => r.shortcuts));
  expect(shortcuts.some((s: any) => s.action === 'faster' && s.key === 'f' && s.shift)).toBe(true);
  expect(errors).toEqual([]);
});
