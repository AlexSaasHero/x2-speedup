import type { Page, Worker } from '@playwright/test';
import { expect, rateOf, sendToTabs, test } from './harness';

const setPro = (sw: Worker, extra: Record<string, unknown> = {}) =>
  sw.evaluate((d) => chrome.storage.local.set({ isPro: true, ...d }), extra);

async function readyBasic(page: Page, origin: string, sw: Worker, path = 'basic.html') {
  await page.goto(`${origin}/${path}`);
  await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
  await page.locator('#v').evaluate((v: HTMLVideoElement) => new Promise((r) => (v.readyState >= 1 ? r(0) : v.addEventListener('loadedmetadata', r, { once: true }))));
}

test.describe('hold to speed', () => {
  test('Pro: Shift+F held → 2.5x, released → back; focus loss also releases', async ({ context, sw, origin }) => {
    await setPro(sw);
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await page.keyboard.press('d');
    await expect.poll(() => rateOf(page)).toBe(1.1);

    await page.keyboard.down('Shift');
    await page.keyboard.down('F');
    await expect.poll(() => rateOf(page)).toBe(2.5);
    await page.keyboard.up('Shift'); // modifier first: still holding
    expect(await rateOf(page)).toBe(2.5);
    await page.keyboard.up('F');
    await expect.poll(() => rateOf(page)).toBe(1.1);

    await page.keyboard.down('Shift');
    await page.keyboard.down('F');
    await expect.poll(() => rateOf(page)).toBe(2.5);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect.poll(() => rateOf(page)).toBe(1.1);
    await page.keyboard.up('F');
    await page.keyboard.up('Shift');
  });

  test('Free: key is locked, speed unchanged', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await page.keyboard.down('Shift');
    await page.keyboard.down('F');
    await page.waitForTimeout(200);
    expect(await rateOf(page)).toBe(1);
    await page.keyboard.up('F');
    await page.keyboard.up('Shift');
  });
});

test.describe('speed rules', () => {
  test('Pro: URL rule beats site rule; rule speed is not remembered globally', async ({ context, sw, origin }) => {
    const port = new URL(origin).port;
    await setPro(sw, {
      rules: [
        { id: 'd', type: 'domain', pattern: '127.0.0.1', speed: 1.75 },
        { id: 'u', type: 'url', pattern: `127.0.0.1:${port}/replace.html`, speed: 2.25 }
      ]
    });
    const a = await context.newPage();
    await readyBasic(a, origin, sw);
    await expect.poll(() => rateOf(a)).toBe(1.75);
    const b = await context.newPage();
    await b.goto(`${origin}/replace.html`);
    await expect.poll(() => rateOf(b)).toBe(2.25);
    await b.waitForTimeout(500);
    expect(await sw.evaluate(() => chrome.storage.local.get('defaultSpeed').then((r) => r.defaultSpeed))).toBe(1);
  });

  test('Free: saved rules are ignored', async ({ context, sw, origin }) => {
    await sw.evaluate(() => chrome.storage.local.set({ rules: [{ id: 'd', type: 'domain', pattern: '127.0.0.1', speed: 1.75 }] }));
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await page.waitForTimeout(500);
    expect(await rateOf(page)).toBe(1);
  });

  test('popup context reports the active rule', async ({ context, sw, origin }) => {
    await setPro(sw, { rules: [{ id: 'd', type: 'domain', pattern: '127.0.0.1', speed: 1.5 }] });
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    const ctx = await sendToTabs(sw, { action: 'GET_PAGE_CONTEXT' });
    expect(ctx).toMatchObject({ host: '127.0.0.1', activeRule: { id: 'd' }, channel: null });
  });
});

test.describe('A-B repeat', () => {
  test('Pro: loops between A and B', async ({ context, sw, origin }) => {
    await setPro(sw);
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    const v = page.locator('#v');
    await v.evaluate((el: HTMLVideoElement) => (el.currentTime = 2));
    await expect((await sendToTabs(sw, { action: 'AB_REPEAT', op: 'a' })).label).toMatch(/^A 0:02/);
    await v.evaluate((el: HTMLVideoElement) => (el.currentTime = 3));
    const res = await sendToTabs(sw, { action: 'AB_REPEAT', op: 'b' });
    expect(res.abLoop).toEqual({ a: 2, b: 3 });
    await v.evaluate((el: HTMLVideoElement) => el.play());
    await page.waitForTimeout(2500);
    const t = await v.evaluate((el: HTMLVideoElement) => el.currentTime);
    expect(t).toBeGreaterThanOrEqual(2);
    expect(t).toBeLessThan(3.6);
    expect((await sendToTabs(sw, { action: 'AB_REPEAT', op: 'clear' })).abLoop).toBeNull();
  });

  test('Free: refused with isProRequired', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    expect(await sendToTabs(sw, { action: 'AB_REPEAT', op: 'a' })).toMatchObject({ isProRequired: true });
  });
});

test.describe('time saved', () => {
  test('playback at 2x is aggregated per day by the background worker', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await sendToTabs(sw, { action: 'SET_SPEED', speed: 2 });
    await page.locator('#v').evaluate((el: HTMLVideoElement) => el.play());
    await page.waitForTimeout(3000);
    const session = (await sendToTabs(sw, { action: 'GET_VIDEO_STATUS' })).sessionSaved;
    expect(session).toBeGreaterThan(1.5);
    // The first delta is written to storage.local immediately, later ones are buffered ≤ 30 s.
    const persisted = () =>
      sw.evaluate(async () => {
        const local = (await chrome.storage.local.get('timeSaved')).timeSaved;
        const buf = (await chrome.storage.session.get('timeSavedBuffer')).timeSavedBuffer;
        const buffered = Object.values((buf?.days ?? {}) as Record<string, { saved: number }>).reduce((n, d) => n + d.saved, 0);
        return { local: local?.total?.saved ?? 0, total: (local?.total?.saved ?? 0) + buffered, days: Object.keys(local?.days ?? {}).length };
      });
    await expect.poll(async () => (await persisted()).total, { timeout: 15_000 }).toBeGreaterThan(1.5);
    const p = await persisted();
    expect(p.local).toBeGreaterThan(0);
    expect(p.days).toBe(1);
  });
});

test.describe('skip silence', () => {
  test('Pro: speeds up during pauses and returns to normal on sound', async ({ context, sw, origin }) => {
    await setPro(sw, {
      skipSilence: { enabled: true, thresholdDb: -42, minSilenceMs: 300, silenceSpeed: 4, minSpeechMs: 200 }
    });
    const page = await context.newPage();
    await page.goto(`${origin}/silence.html`);
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
    await page.locator('#a').evaluate((a: HTMLAudioElement) => a.play());
    await expect.poll(() => page.evaluate(() => (window as any).rates as number[]), { timeout: 15_000 }).toContain(4);
    await expect.poll(() => page.evaluate(() => (window as any).rates.slice((window as any).rates.indexOf(4)) as number[]), { timeout: 15_000 }).toContain(1);
    const status = await sendToTabs(sw, { action: 'GET_VIDEO_STATUS' });
    expect(status.skipSilence).toMatchObject({ enabled: true, listening: 1, unavailable: 0 });
  });

  test('Pro: refuses cross-origin audio without CORS instead of muting/speeding it', async ({ context, sw, origin }) => {
    await setPro(sw, { skipSilence: { enabled: true, thresholdDb: -42, minSilenceMs: 300, silenceSpeed: 4, minSpeechMs: 200 } });
    const page = await context.newPage();
    await page.goto(`${origin}/silence.html?cross=1`);
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
    await page.locator('#a').evaluate((a: HTMLAudioElement) => a.play());
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.skipSilence?.unavailable)).toBe(1);
    await page.waitForTimeout(4000);
    expect(await page.evaluate(() => (window as any).rates)).not.toContain(4);
  });

  test('Free: the Pro module is never loaded', async ({ context, sw, origin }) => {
    await sw.evaluate(() => chrome.storage.local.set({ skipSilence: { enabled: true, thresholdDb: -42, minSilenceMs: 300, silenceSpeed: 4, minSpeechMs: 200 } }));
    const page = await context.newPage();
    await page.goto(`${origin}/silence.html`);
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
    await page.locator('#a').evaluate((a: HTMLAudioElement) => a.play());
    await page.waitForTimeout(4000);
    const status = await sendToTabs(sw, { action: 'GET_VIDEO_STATUS' });
    expect(status.skipSilence).toBeUndefined();
    expect(await page.evaluate(() => (window as any).rates)).not.toContain(4);
  });
});

test('popup Smart tab: free users get the upgrade modal, not an error', async ({ context, extensionId }) => {
  const errors: string[] = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await page.click('.tab-btn[data-tab="pro"]');
  await page.click('label:has(#skipSilenceToggle)');
  await expect(page.locator('#proUpgradeModal')).toBeVisible();
  await expect(page.locator('#skipSilenceToggle')).not.toBeChecked();
  expect(errors).toEqual([]);
});
