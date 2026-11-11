import { describe, expect, it } from 'vitest';
import { checkLocales, readLocaleSources, toChromeMessages } from '../../scripts/locales.mjs';
import { toFirefoxManifest } from '../../scripts/firefox.mjs';
import manifest from '../../public/manifest.json';
import { reviewUrl } from '../../src/shared/links';
import { REVIEW_SNOOZE_MS, REVIEW_THRESHOLD_SECONDS, completeReview, shouldAskForReview, snoozeReview } from '../../src/shared/review';
import { isFeatureUpdate } from '../../src/shared/version';

describe('review prompt', () => {
  const waiting = { state: 'waiting' as const, snoozedUntil: 0 };
  it('asks once 30 minutes are saved', () => {
    expect(shouldAskForReview(waiting, REVIEW_THRESHOLD_SECONDS - 1, 1)).toBe(false);
    expect(shouldAskForReview(waiting, REVIEW_THRESHOLD_SECONDS, 1)).toBe(true);
  });
  it('"Not now" waits 14 days; "Rate" never asks again', () => {
    const s = snoozeReview(1000);
    expect(shouldAskForReview(s, 99999, 1000 + REVIEW_SNOOZE_MS - 1)).toBe(false);
    expect(shouldAskForReview(s, 99999, 1000 + REVIEW_SNOOZE_MS)).toBe(true);
    expect(shouldAskForReview(completeReview(), 99999, Date.now())).toBe(false);
  });
  it('review URL per store', () => {
    expect(reviewUrl('abc', 'chrome', 'Chrome/130')).toBe('https://chromewebstore.google.com/detail/abc/reviews');
    expect(reviewUrl('abc', 'chrome', 'Chrome/130 Edg/130')).toContain('microsoftedge.microsoft.com');
    expect(reviewUrl('abc', 'firefox', 'Firefox/130')).toContain('addons.mozilla.org');
  });
});

describe('changelog on update', () => {
  it('only for major/minor changes', () => {
    expect(isFeatureUpdate('1.7.0', '1.8.0')).toBe(true);
    expect(isFeatureUpdate('1.5.1.8', '1.8.0')).toBe(true);
    expect(isFeatureUpdate('1.8.0', '1.8.1')).toBe(false);
    expect(isFeatureUpdate('1.8.0', '2.0.0')).toBe(true);
    expect(isFeatureUpdate(undefined, '1.8.0')).toBe(false);
  });
});

describe('locales', () => {
  it('every locale has exactly the en keys and placeholders', async () => {
    const sources = await readLocaleSources('src/_locales');
    expect(Object.keys(sources).sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'ja', 'pt_BR']);
    expect(checkLocales(sources)).toEqual([]);
  });
  it('compiles {n} placeholders and escapes $', () => {
    expect(toChromeMessages({ a: 'Trial ($0) for {1}', '// c': 'x' })).toEqual({
      a: { message: 'Trial ($$0) for $p1$', placeholders: { p1: { content: '$1' } } }
    });
  });
  it('manifest strings are localized', () => {
    expect(manifest.name).toBe('__MSG_extName__');
    expect(manifest.default_locale).toBe('en');
  });
});

describe('Firefox manifest', () => {
  it('uses background scripts, gecko id and drops Chrome-only keys', () => {
    const ff = toFirefoxManifest(manifest);
    expect(ff.background).toEqual({ scripts: ['background/background.js'] });
    expect(ff.browser_specific_settings.gecko.id).toMatch(/@/);
    expect(ff.content_scripts[0]).not.toHaveProperty('match_origin_as_fallback');
    expect(manifest.content_scripts[0]).toHaveProperty('match_origin_as_fallback');
  });
});
