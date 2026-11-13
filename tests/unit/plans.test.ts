import { describe, expect, it } from 'vitest';
import { FREE_MAX_SPEED, FREE_MIN_SPEED, PLANS, PRO_MAX_SPEED, clampSpeed, formatSpeed } from '../../src/config/plans';
import { affectsEntitlement, can, isPro } from '../../src/shared/entitlement';

const PRO = { license: { key: 'K', status: 'active', source: 'x2', lastValidAt: Date.now(), lastCheckedAt: Date.now(), expiresAt: null } };

describe('plans', () => {
  it('pro range contains free range', () => {
    expect(PLANS.pro.minSpeed).toBeLessThanOrEqual(FREE_MIN_SPEED);
    expect(PRO_MAX_SPEED).toBeGreaterThanOrEqual(FREE_MAX_SPEED);
  });

  it('every pro feature is enabled', () => {
    expect(Object.values(PLANS.pro.features).every(Boolean)).toBe(true);
  });

  it('speed is free up to 16x: both plans share the same range', () => {
    expect(FREE_MIN_SPEED).toBe(PLANS.pro.minSpeed);
    expect(FREE_MAX_SPEED).toBe(PRO_MAX_SPEED);
    expect(FREE_MAX_SPEED).toBe(16);
  });

  it('clamps to the plan range', () => {
    expect(clampSpeed(10, false)).toBe(10);
    expect(clampSpeed(99, false)).toBe(FREE_MAX_SPEED);
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
  it('isPro only from a server-validated license (no more "any 4-char key")', () => {
    expect(isPro(undefined)).toBe(false);
    expect(isPro({})).toBe(false);
    expect(isPro({ license: { key: 'abcd', status: 'invalid' } })).toBe(false);
    expect(isPro(PRO)).toBe(true);
  });

  it('study tools are Pro-only; speed tools are free', () => {
    for (const f of ['customHotkeys', 'checkpoints', 'frameStep', 'rules', 'skipSilence', 'abRepeat', 'statsDetails'] as const) {
      expect(can(f, {})).toBe(false);
      expect(can(f, PRO)).toBe(true);
    }
    expect(can('holdToSpeed', {})).toBe(true);
    expect(can('skipTime', {})).toBe(true);
  });

  it('gates features through the plan table', () => {
    expect(can('frameStep', {})).toBe(PLANS.free.features.frameStep);
    expect(can('frameStep', PRO)).toBe(true);
  });

  it('detects entitlement-relevant storage changes', () => {
    expect(affectsEntitlement({ license: {} })).toBe(true);
    expect(affectsEntitlement({ licenseKey: {} })).toBe(false);
    expect(affectsEntitlement({ defaultSpeed: {} })).toBe(false);
  });
});
