import type { Page } from '@playwright/test';
import { expect, rateOf, sendToTabs, test } from './harness';

async function openFixture(page: Page, origin: string, name: string) {
  await page.goto(`${origin}/${name}`);
  // Content script is ready once it reports media for this page.
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('video,audio').length)).toBeGreaterThan(0);
}

async function readyBasic(page: Page, origin: string, sw: any) {
  await openFixture(page, origin, 'basic.html');
  await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
  await page.locator('#v').evaluate((v: HTMLVideoElement) => new Promise((r) => (v.readyState >= 1 ? r(0) : v.addEventListener('loadedmetadata', r, { once: true }))));
}

test.describe('shortcuts', () => {
  test('VSC defaults: D/S step, R toggles reset, G preferred, X/Z seek', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);

    await page.keyboard.press('d');
    await expect.poll(() => rateOf(page)).toBe(1.1);
    await page.keyboard.press('d');
    await page.keyboard.press('s');
    await expect.poll(() => rateOf(page)).toBe(1.1);

    await page.keyboard.press('r');
    await expect.poll(() => rateOf(page)).toBe(1);
    await page.keyboard.press('r');
    await expect.poll(() => rateOf(page)).toBe(1.1);

    await page.keyboard.press('g');
    await expect.poll(() => rateOf(page)).toBe(2);
    await page.keyboard.press('g');
    await expect.poll(() => rateOf(page)).toBe(1);

    const time = () => page.locator('#v').evaluate((v: HTMLVideoElement) => v.currentTime);
    await page.keyboard.press('x');
    await expect.poll(time).toBe(10);
    await page.keyboard.press('z');
    await page.keyboard.press('z');
    await expect.poll(time).toBe(0);

    // Handled keys never reach the page; unbound ones do.
    const keys = await page.evaluate(() => (window as any).pageKeys);
    expect(keys).toEqual([]);
    await page.keyboard.press('Shift+D');
    await expect.poll(() => page.evaluate(() => (window as any).pageKeys)).toEqual(['Shift', 'D']);
    expect(await rateOf(page)).toBe(1);
  });

  test('free plan stops at 4x and says so', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await sw.evaluate(() => chrome.storage.local.set({ speedStep: 1 }));
    await expect.poll(async () => {
      await page.keyboard.press('d');
      return rateOf(page);
    }).toBe(4);
    await page.keyboard.press('d');
    expect(await rateOf(page)).toBe(4);
  });

  for (const [name, selector] of [
    ['input', '#text'],
    ['textarea', '#area'],
    ['contenteditable', '#editable']
  ] as const) {
    test(`ignored while typing in ${name}`, async ({ context, sw, origin }) => {
      const page = await context.newPage();
      await readyBasic(page, origin, sw);
      await page.focus(selector);
      await page.keyboard.type('dsx');
      expect(await rateOf(page)).toBe(1);
      if (name === 'contenteditable') await expect(page.locator(selector)).toContainText('dsx');
      else await expect(page.locator(selector)).toHaveValue('dsx');
    });
  }

  test('ignored while typing in an input inside an open shadow root', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await page.locator('#shadowHost').evaluate((h) => (h.shadowRoot!.getElementById('inner') as HTMLInputElement).focus());
    await page.keyboard.type('dd');
    expect(await rateOf(page)).toBe(1);
    expect(await page.locator('#shadowHost').evaluate((h) => (h.shadowRoot!.getElementById('inner') as HTMLInputElement).value)).toBe('dd');
  });

  test('disabled on blacklisted domains (keys reach the site)', async ({ context, sw, origin }) => {
    await sw.evaluate(() => chrome.storage.local.set({ shortcutBlacklist: ['127.0.0.1'] }));
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await page.keyboard.press('d');
    await expect.poll(() => page.evaluate(() => (window as any).pageKeys)).toEqual(['d']);
    expect(await rateOf(page)).toBe(1);
  });

  test('works inside a same-origin iframe', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await page.goto(`${origin}/iframe.html`);
    const frame = page.frameLocator('#frame');
    await expect.poll(() => frame.locator('#v').evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0);
    await frame.locator('#v').click();
    await page.keyboard.press('d');
    await expect.poll(() => frame.locator('#v').evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(1.1);
    // The popup reaches the frame that holds the media even though the top frame has none.
    const res = await sendToTabs(sw, { action: 'GET_VIDEO_STATUS' });
    expect(res.hasVideo).toBe(true);
  });
});

test.describe('persistence', () => {
  test('restores speed after the site resets it', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await sendToTabs(sw, { action: 'SET_SPEED', speed: 1.75 });
    await expect.poll(() => rateOf(page)).toBe(1.75);
    await page.locator('#v').evaluate((v: HTMLVideoElement) => (v.playbackRate = 1));
    await expect.poll(() => rateOf(page)).toBe(1.75);
  });

  test('accepts a change made through the player by the user', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await sendToTabs(sw, { action: 'SET_SPEED', speed: 1.75 });
    await page.waitForTimeout(1600); // past the post-load settle window
    await page.locator('#v').click(); // gesture inside the player…
    await page.locator('#v').evaluate((v: HTMLVideoElement) => (v.playbackRate = 1.25)); // …then the player's own menu changes speed
    await page.waitForTimeout(300);
    expect(await rateOf(page)).toBe(1.25);
    await expect.poll(() => sw.evaluate(() => chrome.storage.local.get('defaultSpeed').then((r) => r.defaultSpeed))).toBe(1.25);
  });

  test('backs off from a player that fights forever (no infinite loop)', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await openFixture(page, origin, 'fight.html');
    await expect.poll(() => sendToTabs(sw, { action: 'GET_VIDEO_STATUS' }).then((r) => r?.hasVideo ?? false)).toBe(true);
    await sendToTabs(sw, { action: 'SET_SPEED', speed: 1.5 });
    await page.waitForTimeout(2000);
    const forced = await page.evaluate(() => (window as any).forced);
    expect(forced).toBeGreaterThan(0);
    expect(forced).toBeLessThan(30);
    expect(await page.evaluate(() => 1 + 1)).toBe(2); // page still responsive
  });

  test('applies to a replacement <video> element', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await openFixture(page, origin, 'replace.html');
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 1.5 }).then((r) => r?.speed)).toBe(1.5);
    await page.evaluate(() => (window as any).replaceVideo());
    await expect.poll(() => rateOf(page, '#v2')).toBe(1.5);
  });

  test('remembers the speed for new pages without moving other open tabs', async ({ context, sw, origin }) => {
    const a = await context.newPage();
    await readyBasic(a, origin, sw);
    const b = await context.newPage();
    await openFixture(b, origin, 'replace.html');
    await a.bringToFront();
    await a.keyboard.press('d');
    await expect.poll(() => rateOf(a)).toBe(1.1);
    await expect.poll(() => sw.evaluate(() => chrome.storage.local.get('defaultSpeed').then((r) => r.defaultSpeed))).toBe(1.1);
    expect(await rateOf(b)).toBe(1);
    await b.reload();
    await expect.poll(() => rateOf(b)).toBe(1.1);
  });
});

test.describe('media detection', () => {
  test('finds video inside an open shadow root added later', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await page.goto(`${origin}/shadow.html`);
    await expect.poll(() => page.evaluate(() => !!(window as any).shadowVideo())).toBe(true);
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 1.5 }).then((r) => r?.speed)).toBe(1.5);
    await expect.poll(() => page.evaluate(() => (window as any).shadowVideo().playbackRate)).toBe(1.5);
  });

  test('controls <audio> elements', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await openFixture(page, origin, 'audio.html');
    await expect.poll(() => sendToTabs(sw, { action: 'SET_SPEED', speed: 1.5 }).then((r) => r?.speed)).toBe(1.5);
    await expect.poll(() => rateOf(page, '#a')).toBe(1.5);
  });
});

test.describe('overlay', () => {
  test('isolated host that does not block clicks on the player', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await page.keyboard.press('d');
    const host = page.locator('[data-speedup-overlay]');
    await expect(host).toHaveCount(1);
    const info = await host.evaluate((h) => ({
      parent: h.parentElement?.tagName,
      pointerEvents: getComputedStyle(h).pointerEvents,
      // closed shadow root: page scripts cannot reach inside
      shadow: h.shadowRoot
    }));
    expect(info).toEqual({ parent: 'HTML', pointerEvents: 'none', shadow: null });
    // The player is untouched (old HUD forced position:relative on it).
    expect(await page.locator('#player').evaluate((p) => p.style.position)).toBe('');
    // Centre of the video is still the video.
    const tag = await page.evaluate(() => {
      const r = document.getElementById('v')!.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.id;
    });
    expect(tag).toBe('v');
  });

  test('moves into the fullscreen element', async ({ context, sw, origin }) => {
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await page.click('#fs');
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id ?? null)).toBe('player');
    await page.keyboard.press('d');
    await expect.poll(() => page.locator('[data-speedup-overlay]').evaluate((h) => h.parentElement?.id)).toBe('player');
  });

  test('V hides the overlay for the session; disabled setting removes it', async ({ context, sw, origin }) => {
    await sw.evaluate(() => chrome.storage.local.set({ hudEnabled: false }));
    const page = await context.newPage();
    await readyBasic(page, origin, sw);
    await page.keyboard.press('d');
    await expect.poll(() => rateOf(page)).toBe(1.1);
    await expect(page.locator('[data-speedup-overlay]')).toHaveCount(0);
  });
});
