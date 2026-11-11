import { describe, expect, it } from 'vitest';
import { normaliseContentSettings } from '../../src/content/settings';
import { migrate } from '../../src/shared/migrations';
import { binding, defaultShortcuts } from '../../src/shared/shortcuts';

describe('content settings normaliser (light read, no migration bundled)', () => {
  it('matches the full migration on a clean store', () => {
    const full = migrate({}).set as Record<string, unknown>;
    const s = normaliseContentSettings(full);
    expect(s.shortcuts).toEqual(defaultShortcuts());
    expect(s.speedStep).toBe(full.speedStep);
    expect(s.pro).toBe(false);
  });

  it('falls back to defaults on wrong types and drops invalid shortcuts', () => {
    const s = normaliseContentSettings({
      speedStep: 'x',
      seekSeconds: Infinity,
      hudEnabled: 'yes',
      shortcuts: [binding('faster', 'd'), { action: 'bogus', key: 'q' }],
      shortcutBlacklist: ['a.com', 3],
      skipSilence: { enabled: true }
    });
    expect(s.speedStep).toBe(0.1);
    expect(s.seekSeconds).toBe(10);
    expect(s.hudEnabled).toBe(true);
    expect(s.shortcuts).toEqual([binding('faster', 'd')]);
    expect(s.shortcutBlacklist).toEqual(['a.com']);
    expect(s.skipSilence).toMatchObject({ enabled: true, silenceSpeed: 4 });
  });

  it('Pro comes only from a valid license', () => {
    const now = Date.now();
    expect(normaliseContentSettings({ license: { key: 'K', status: 'active', source: 'x2', lastValidAt: now, lastCheckedAt: now } }).pro).toBe(true);
    expect(normaliseContentSettings({ isPro: true, licenseKey: 'abcdef' }).pro).toBe(false);
  });
});

import { quirksFor } from '../../src/content/quirks';
describe('site quirks', () => {
  it('Netflix: no direct seeking', () => {
    expect(quirksFor('www.netflix.com').noDirectSeek).toBe(true);
    expect(quirksFor('netflix.com').noDirectSeek).toBe(true);
    expect(quirksFor('notnetflix.com').noDirectSeek).toBe(false);
    expect(quirksFor('www.youtube.com').noDirectSeek).toBe(false);
  });
});
