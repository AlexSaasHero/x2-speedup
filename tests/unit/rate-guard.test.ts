// @vitest-environment happy-dom
// Page-world rate guard (BUGS #24): lecture players cannot overwrite the speed the extension owns.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { LECTURE_PLATFORMS } from '../../src/content/quirks';
import { BLOCKED_ATTR, installRateGuard, OWNED_RATE_ATTR, ownedRate } from '../../src/shared/rate-guard';

/** A stand-in for HTMLMediaElement: native-like accessors that fire `ratechange` on every write. */
class FakeMedia extends HTMLElement {
  rate = 1;
  defaultRate = 1;
  events = 0;
}
for (const [prop, field] of [['playbackRate', 'rate'], ['defaultPlaybackRate', 'defaultRate']] as const) {
  Object.defineProperty(FakeMedia.prototype, prop, {
    configurable: true,
    enumerable: true,
    get(this: FakeMedia) { return this[field]; },
    set(this: FakeMedia, v: number) { this[field] = v; this.events++; }
  });
}
customElements.define('fake-media', FakeMedia);
type Media = FakeMedia & { playbackRate: number; defaultPlaybackRate: number };

describe('rate guard', () => {
  let m: Media;
  beforeEach(() => {
    installRateGuard(FakeMedia.prototype);
    m = document.createElement('fake-media') as Media;
  });

  it('lets the page set the speed of elements the extension does not own', () => {
    m.playbackRate = 1.5;
    expect(m.playbackRate).toBe(1.5);
  });

  it('keeps the owned speed when the player writes its own (no ratechange, no tug of war)', () => {
    m.setAttribute(OWNED_RATE_ATTR, '2.6');
    m.playbackRate = 2.6; // first write puts the element on the owned speed
    const events = m.events;
    m.playbackRate = 1; // the player resets to its menu value
    m.defaultPlaybackRate = 1;
    expect(m.playbackRate).toBe(2.6);
    expect(m.defaultPlaybackRate).toBe(2.6);
    expect(m.events).toBe(events + 1); // only defaultPlaybackRate moved (from 1 to 2.6), once
    m.playbackRate = 1;
    m.defaultPlaybackRate = 1;
    expect(m.events).toBe(events + 1); // repeated resets are no-ops
  });

  it('flags the element the first time it blocks a different speed (for the lecture toast)', () => {
    m.setAttribute(OWNED_RATE_ATTR, '2');
    m.playbackRate = 2;
    expect(m.hasAttribute(BLOCKED_ATTR)).toBe(false); // the extension's own speed: nothing blocked
    m.playbackRate = 1;
    expect(m.hasAttribute(BLOCKED_ATTR)).toBe(true);
  });

  it('moves an element that is off the owned speed to it, whatever the page asked', () => {
    m.setAttribute(OWNED_RATE_ATTR, '2');
    m.playbackRate = 1;
    expect(m.playbackRate).toBe(2);
  });

  it('follows the attribute when the extension changes speed, and releases the element without it', () => {
    m.setAttribute(OWNED_RATE_ATTR, '2');
    m.playbackRate = 1;
    m.setAttribute(OWNED_RATE_ATTR, '3');
    m.playbackRate = 1;
    expect(m.playbackRate).toBe(3);
    m.removeAttribute(OWNED_RATE_ATTR);
    m.playbackRate = 1.25;
    expect(m.playbackRate).toBe(1.25);
  });

  it('ignores invalid attribute values and installs only once', () => {
    m.setAttribute(OWNED_RATE_ATTR, 'abc');
    expect(ownedRate(m)).toBeNull();
    m.playbackRate = 1.5;
    expect(m.playbackRate).toBe(1.5);
    const setter = Object.getOwnPropertyDescriptor(FakeMedia.prototype, 'playbackRate')!.set;
    expect(installRateGuard(FakeMedia.prototype)).toBe(true);
    expect(Object.getOwnPropertyDescriptor(FakeMedia.prototype, 'playbackRate')!.set).toBe(setter);
  });
});

describe('manifest: page-world guard runs only on lecture platforms', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
  const guard = manifest.content_scripts.find((cs: { js: string[] }) => cs.js.includes('content/main-world.js'));

  it('is a MAIN-world script at document_start in every frame', () => {
    expect(guard).toMatchObject({ world: 'MAIN', run_at: 'document_start', all_frames: true });
  });

  it('matches exactly the LECTURE_PLATFORMS domains (subdomains included)', () => {
    const expected = Object.values(LECTURE_PLATFORMS).flat().map((d) => `*://*.${d}/*`).sort();
    expect([...guard.matches].sort()).toEqual(expected);
  });

  it('adds no permission', () => {
    expect(manifest.permissions).toEqual(['storage', 'activeTab', 'alarms']);
    expect(manifest.host_permissions).toEqual(['https://api.lemonsqueezy.com/*']);
  });
});
