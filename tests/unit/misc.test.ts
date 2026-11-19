import { describe, expect, it } from 'vitest';
import { checkLocales, readLocaleSources, toChromeMessages } from '../../scripts/locales.mjs';
import { toFirefoxManifest } from '../../scripts/firefox.mjs';
import manifest from '../../public/manifest.json';
import { CWS_REVIEWS_URL, reviewUrl } from '../../src/shared/links';
import {
  REVIEW_MAX_DISMISSALS,
  REVIEW_MIN_INSTALL_AGE_MS,
  REVIEW_SNOOZE_MS,
  REVIEW_THRESHOLD_SECONDS,
  completeReview,
  initialReviewPrompt,
  savedHours,
  shouldAskForReview,
  snoozeReview
} from '../../src/shared/review';
import { isFeatureUpdate } from '../../src/shared/version';

describe('review prompt', () => {
  const H = 3600;
  const DAY = 24 * 60 * 60 * 1000;
  const installed = 1_000_000_000_000;
  const ready = installed + REVIEW_MIN_INSTALL_AGE_MS; // installed exactly 5 days ago
  const fresh = initialReviewPrompt();

  it('needs 3 hours saved in total', () => {
    expect(REVIEW_THRESHOLD_SECONDS).toBe(3 * H);
    expect(shouldAskForReview(fresh, 3 * H - 1, installed, ready)).toBe(false);
    expect(shouldAskForReview(fresh, 3 * H, installed, ready)).toBe(true);
  });

  it('needs the extension installed for 5 days', () => {
    expect(REVIEW_MIN_INSTALL_AGE_MS).toBe(5 * DAY);
    expect(shouldAskForReview(fresh, 10 * H, installed, installed + 5 * DAY - 1)).toBe(false);
    expect(shouldAskForReview(fresh, 10 * H, installed, installed + 5 * DAY)).toBe(true);
  });

  it('"Not now" comes back after 14 days', () => {
    expect(REVIEW_SNOOZE_MS).toBe(14 * DAY);
    const once = snoozeReview(fresh, ready);
    expect(once.dismissals).toBe(1);
    expect(shouldAskForReview(once, 10 * H, installed, ready + 14 * DAY - 1)).toBe(false);
    expect(shouldAskForReview(once, 10 * H, installed, ready + 14 * DAY)).toBe(true);
  });

  it('at most twice: after the second "Not now" never again', () => {
    const twice = snoozeReview(snoozeReview(fresh, ready), ready + 14 * DAY);
    expect(twice.dismissals).toBe(REVIEW_MAX_DISMISSALS);
    expect(shouldAskForReview(twice, 10 * H, installed, ready + 28 * DAY)).toBe(false);
    expect(shouldAskForReview(twice, 1000 * H, installed, ready + 365 * DAY)).toBe(false);
  });

  it('"Leave a review" means never again', () => {
    expect(shouldAskForReview(completeReview(fresh), 1000 * H, installed, ready + 365 * DAY)).toBe(false);
    const afterSnooze = completeReview(snoozeReview(fresh, ready));
    expect(shouldAskForReview(afterSnooze, 1000 * H, installed, ready + 365 * DAY)).toBe(false);
  });

  it('banner shows whole hours', () => {
    expect(savedHours(3 * H)).toBe(3);
    expect(savedHours(4 * H - 1)).toBe(3);
  });

  it('review URL per store', () => {
    expect(CWS_REVIEWS_URL).toBe('https://chromewebstore.google.com/detail/bhbogbkkghkempphmaffejebjiimbimh/reviews');
    expect(reviewUrl('chrome')).toBe(CWS_REVIEWS_URL); // Chrome and Edge (both install from the CWS)
    expect(reviewUrl('firefox', false)).toBeNull(); // not on AMO yet: no prompt on Firefox
    expect(reviewUrl('firefox', true)).toContain('addons.mozilla.org/firefox/addon/speedup-video-pro@x2-speedup/reviews');
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
    expect(ff.optional_host_permissions).toEqual(['<all_urls>']);
    expect(manifest).not.toHaveProperty('optional_host_permissions');
  });
});
