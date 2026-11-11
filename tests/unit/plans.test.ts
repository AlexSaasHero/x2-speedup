import { describe, expect, it } from 'vitest';
import { FREE_MAX_SPEED, FREE_MIN_SPEED, PLANS, PRO_MAX_SPEED, clampSpeed, formatSpeed } from '../../src/config/plans';
import { affectsEntitlement, can, isPro } from '../../src/shared/entitlement';

describe('plans', () => {
  it('pro range contains free range', () => {
    expect(PLANS.pro.minSpeed).toBeLessThanOrEqual(FREE_MIN_SPEED);
    expect(PRO_MAX_SPEED).toBeGreaterThanOrEqual(FREE_MAX_SPEED);
  });

  it('every pro feature is enabled', () => {
    expect(Object.values(PLANS.pro.features).every(Boolean)).toBe(true);
  });

  it('clamps to the plan range', () => {
    expect(clampSpeed(10, false)).toBe(FREE_MAX_SPEED);
    expect(clampSpeed(10, true)).toBe(10);
    expect(clampSpeed(99, true)).toBe(PRO_MAX_SPEED);
    expect(clampSpeed(0.01, false)).toBe(FREE_MIN_SPEED);
    expect(clampSpeed('1.234', true)).toBe(1.23);
  });

  it('falls back to 1x on invalid input', () => {
    expect(clampSpeed('abc', true)).toBe(1);
    expect(clampSpeed(NaN, false)).toBe(1);
    expect(clampSpeed(Infinity, true)).toBe(1);
  });

  it('formats speeds', () => {
    expect(formatSpeed(2)).toBe('2.0x');
    expect(formatSpeed(1.1)).toBe('1.1x');
    expect(formatSpeed(1.25)).toBe('1.25x');
  });
});

describe('entitlement', () => {
  it('isPro from flag or (baseline) key length', () => {
    expect(isPro(undefined)).toBe(false);
    expect(isPro({})).toBe(false);
    expect(isPro({ isPro: true })).toBe(true);
    expect(isPro({ isPro: 'yes' })).toBe(false);
    expect(isPro({ licenseKey: 'abc' })).toBe(false);
    expect(isPro({ licenseKey: ' abcd ' })).toBe(true);
  });

  it('every Phase 2 feature is Pro-only', () => {
    for (const f of ['skipSilence', 'rules', 'youtubeAds', 'holdToSpeed', 'abRepeat', 'statsDetails'] as const) {
      expect(can(f, {})).toBe(false);
      expect(can(f, { isPro: true })).toBe(true);
    }
    expect(can('customHotkeys', {})).toBe(true);
    expect(can('skipTime', {})).toBe(true);
  });

  it('gates features through the plan table', () => {
    expect(can('frameStep', {})).toBe(PLANS.free.features.frameStep);
    expect(can('frameStep', { isPro: true })).toBe(true);
  });

  it('detects entitlement-relevant storage changes', () => {
    expect(affectsEntitlement({ licenseKey: {} })).toBe(true);
    expect(affectsEntitlement({ defaultSpeed: {} })).toBe(false);
  });
});
