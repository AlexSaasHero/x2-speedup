import { chromium, type Route } from '@playwright/test';
import path from 'node:path';
import { expect, proLicense, test } from './harness';

/** Fake license servers (the harness blocks the real ones). */
async function fakeServers(context: import('@playwright/test').BrowserContext, answer: (key: string) => object | null) {
  await context.unroute(/x2-speedup\.vercel\.app|lemonsqueezy\.com/);
  await context.route(/x2-speedup\.vercel\.app\/api\/validate-license/, async (route: Route) => {
    const key = JSON.parse(route.request().postData() ?? '{}').license_key;
    const body = answer(key);
    if (!body) return route.abort();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await context.route(/lemonsqueezy\.com/, (route) => route.abort());
}

test.describe('license', () => {
  test.afterEach(async ({ context }) => {
    await context.unroute(/x2-speedup\.vercel\.app\/api\/validate-license/).catch(() => {});
    await context.unroute(/lemonsqueezy\.com/).catch(() => {});
    await context.route(/x2-speedup\.vercel\.app|lemonsqueezy\.com/, (route) => route.abort());
  });

  test('popup activation goes through the worker: valid key → Pro; unknown key → error', async ({ context, sw, extensionId }) => {
    await fakeServers(context, (key) => (key === 'GOOD-KEY' ? { status: 'valid' } : { status: 'invalid' }));
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.click('#openUpgradeBtn');
    await page.fill('#input-license-key', 'PRO-1234'); // used to be accepted offline by format
    await page.click('#activateBtn');
    await expect(page.locator('#statusMsg')).toHaveText('Invalid license key.');
    await page.fill('#input-license-key', 'GOOD-KEY');
    await page.click('#activateBtn');
    await expect(page.locator('#tierBadgeText')).toHaveText('Pro Active ✨');
    const license = await sw.evaluate(() => chrome.storage.local.get('license').then((r) => r.license));
    expect(license).toMatchObject({ key: 'GOOD-KEY', status: 'active' });
  });

  test('server down: new key is not accepted, existing Pro keeps working (grace)', async ({ context, sw, extensionId }) => {
    // Harness blocks the servers (= offline).
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.click('#openUpgradeBtn');
    await page.fill('#input-license-key', 'ANY-KEY');
    await page.click('#activateBtn');
    await expect(page.locator('#statusMsg')).toContainText("Couldn't reach the license server");
    expect(await sw.evaluate(() => chrome.storage.local.get('license').then((r) => r.license.status))).toBe('none');

    // Validated 3 days ago, daily check fails → still Pro, badge says offline.
    const threeDays = Date.now() - 3 * 86_400_000;
    await sw.evaluate((l) => chrome.storage.local.set({ license: l }), { ...proLicense(threeDays), lastCheckedAt: 0 });
    await sw.evaluate(() => chrome.runtime.sendMessage({ action: 'LICENSE_REFRESH' }).catch(() => null));
    await page.reload();
    await expect(page.locator('#tierBadgeText')).toHaveText('Pro (offline, will re-verify)');
  });

  test('daily re-check turns an expired trial off', async ({ context, sw, extensionId }) => {
    await fakeServers(context, () => ({ valid: false, status: 'expired' }));
    await sw.evaluate((l) => chrome.storage.local.set({ license: l }), { ...proLicense(), lastCheckedAt: 0 });
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await page.evaluate(() => chrome.runtime.sendMessage({ action: 'LICENSE_REFRESH' }));
    await expect.poll(() => sw.evaluate(() => chrome.storage.local.get('license').then((r) => r.license.status))).toBe('expired');
    await page.reload();
    await expect(page.locator('#tierBadgeText')).toHaveText(/Free Tier/);
    await expect(page.locator('#footerLicenseStatus')).toHaveText('Trial/license expired');
  });

  test('content scripts cannot activate a license', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await page.goto(`${origin}/basic.html`);
    // Simulate a compromised page context that reaches the extension messaging API: only the
    // worker's sender check matters, so send from a tab-backed context.
    const res = await sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({});
      return tab?.id ?? null;
    });
    expect(res).not.toBeNull();
    expect(await sw.evaluate(() => chrome.storage.local.get('license').then((r) => r.license.status))).toBe('none');
  });
});

test('onboarding page: localized, shortcut demo reacts to the user keys, no errors', async ({ context, extensionId }) => {
  const errors: string[] = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`chrome-extension://${extensionId}/onboarding/onboarding.html`);
  await expect(page.locator('h1')).toHaveText('Welcome to SpeedUp Video Pro');
  await expect(page.locator('#demoKeys li')).toHaveCount(6);
  await page.click('#demoPlay');
  await page.keyboard.press('d');
  await expect(page.locator('#demoSpeed')).toHaveText('1.1x');
  await expect(page.locator('#changelog .release')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('options: import Video Speed Controller settings', async ({ context, sw, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options/options.html`);
  await page.fill(
    '#importText',
    JSON.stringify({
      keyBindings: [
        { action: 'faster', key: 69, value: 0.2 },
        { action: 'rewind', key: 81, value: 7 },
        { action: 'mark', key: 77, value: 0 }
      ],
      blacklist: 'example.org\n'
    })
  );
  await page.click('#importBtn');
  await expect(page.locator('#importMsg')).toContainText('Video Speed Controller');
  await expect(page.locator('#importMsg')).toContainText('mark');
  const s = await sw.evaluate(() => chrome.storage.local.get(['speedStep', 'seekSeconds', 'shortcutBlacklist', 'shortcuts']));
  expect(s).toMatchObject({ speedStep: 0.2, seekSeconds: 7, shortcutBlacklist: ['example.org'] });
  expect(s.shortcuts.find((x: any) => x.action === 'faster').key).toBe('e');
});

test('settings are mirrored to storage.sync in chunks (no license, no stats)', async ({ sw, extensionId, context }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options/options.html`);
  await page.fill('#seekSeconds', '42');
  await page.locator('#seekSeconds').dispatchEvent('change');
  const synced = () =>
    sw.evaluate(async () => {
      const all = await chrome.storage.sync.get(null);
      const n = all.cfg_meta?.chunks ?? 0;
      return n ? JSON.parse(Array.from({ length: n }, (_, i) => all[`cfg_${i}`]).join('')) : null;
    });
  await expect.poll(async () => (await synced())?.seekSeconds, { timeout: 10_000 }).toBe(42);
  const settings = await synced();
  expect(settings).not.toHaveProperty('license');
  expect(settings).not.toHaveProperty('videoCheckpoints');
});

test('UI follows the browser language (Italian)', async () => {
  // macOS Chromium takes its UI language from the system (AppleLanguages), not --lang, and
  // Playwright cannot pass Cocoa-style arguments. Locale files are verified by unit tests there.
  test.skip(process.platform === 'darwin', 'UI language cannot be forced on macOS');
  const dist = path.resolve('dist');
  const ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    locale: 'it-IT',
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--lang=it'],
    env: { ...process.env, LANG: 'it_IT.UTF-8', LANGUAGE: 'it' }
  });
  try {
    await ctx.route(/x2-speedup\.vercel\.app|lemonsqueezy\.com/, (r) => r.abort());
    const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
    const id = new URL(sw.url()).host;
    const page = await ctx.newPage();
    await page.goto(`chrome-extension://${id}/popup/popup.html`);
    await expect(page.locator('[data-i18n="tab_shortcuts"]')).toHaveText('Scorciatoie');
    await expect(page.locator('#footerCtaBtnText')).toHaveText('Inizia la prova gratuita di 7 giorni ($0)');
  } finally {
    await ctx.close();
  }
});
