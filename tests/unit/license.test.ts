import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  LICENSE_GRACE_MS,
  LS_PRODUCT_ANNUAL,
  LS_PRODUCT_IDS,
  LS_PRODUCT_LIFETIME,
  LS_STORE_ID,
  applyVerdict,
  interpretLemonSqueezy,
  isOurProduct,
  isInGrace,
  licenseGrantsPro,
  needsCheck,
  noLicense,
  validateLicense,
  type LicenseState
} from '../../src/shared/license';

const NOW = 1_800_000_000_000;
const active = (over: Partial<LicenseState> = {}): LicenseState => ({
  ...noLicense(),
  key: 'KEY',
  status: 'active',
  source: 'x2',
  lastValidAt: NOW,
  lastCheckedAt: NOW,
  ...over
});

describe('grace period', () => {
  it('Pro while validated within 1 day + 7 days offline grace', () => {
    expect(licenseGrantsPro(active(), NOW)).toBe(true);
    expect(licenseGrantsPro(active({ lastValidAt: NOW - LICENSE_GRACE_MS + 1 }), NOW)).toBe(true);
    expect(licenseGrantsPro(active({ lastValidAt: NOW - LICENSE_GRACE_MS - 1 }), NOW)).toBe(false);
    expect(LICENSE_GRACE_MS).toBe(8 * DAY_MS);
  });

  it('reports grace only after a missed daily check', () => {
    expect(isInGrace(active(), NOW)).toBe(false);
    expect(isInGrace(active({ lastValidAt: NOW - 2 * DAY_MS }), NOW)).toBe(true);
  });

  it('non-active states never grant Pro', () => {
    for (const status of ['none', 'expired', 'revoked', 'invalid', 'limit'] as const) {
      expect(licenseGrantsPro(active({ status }), NOW)).toBe(false);
    }
  });

  it('dev licenses never expire; expiry date + grace ends Pro', () => {
    expect(licenseGrantsPro(active({ source: 'dev', lastValidAt: 0 }), NOW)).toBe(true);
    expect(licenseGrantsPro(active({ expiresAt: NOW - 8 * DAY_MS }), NOW)).toBe(false);
  });

  it('checks at most once a day', () => {
    expect(needsCheck(active(), NOW + DAY_MS - 1)).toBe(false);
    expect(needsCheck(active(), NOW + DAY_MS)).toBe(true);
    expect(needsCheck(active({ lastCheckedAt: 0, source: 'migrated' }), NOW)).toBe(true);
    expect(needsCheck(noLicense(), NOW)).toBe(false);
  });
});

describe('server answers', () => {
  it('Lemon Squeezy', () => {
    const meta = { store_id: LS_STORE_ID, product_id: LS_PRODUCT_ANNUAL, variant_id: 1 };
    expect(interpretLemonSqueezy(200, { valid: true, license_key: { status: 'active' }, meta }).kind).toBe('valid');
    expect(interpretLemonSqueezy(200, { valid: true, license_key: { status: 'inactive', expires_at: '2030-01-01T00:00:00Z' }, meta })).toEqual({
      kind: 'valid',
      expiresAt: Date.parse('2030-01-01T00:00:00Z')
    });
    expect(interpretLemonSqueezy(200, { valid: false, license_key: { status: 'expired' } }).kind).toBe('expired');
    expect(interpretLemonSqueezy(200, { valid: false, license_key: { status: 'disabled' } }).kind).toBe('revoked');
    expect(interpretLemonSqueezy(404, { valid: false, error: 'license_key not found.' }).kind).toBe('invalid');
    expect(interpretLemonSqueezy(200, { valid: true, license_key: { status: 'active', activation_limit: 2, activation_usage: 3 }, meta }).kind).toBe('limit');
    expect(interpretLemonSqueezy(0, null).kind).toBe('unreachable');
    for (const s of [429, 500, 503]) expect(interpretLemonSqueezy(s, null).kind).toBe('unreachable');
  });

  it('a valid key from another Lemon Squeezy store never unlocks Pro', () => {
    const other = { valid: true, license_key: { status: 'active' }, meta: { store_id: 1, product_id: 1 } };
    expect(interpretLemonSqueezy(200, other).kind).toBe('invalid');
    expect(interpretLemonSqueezy(200, { valid: true, license_key: { status: 'active' } }).kind).toBe('invalid');
    expect(isOurProduct({ store_id: String(LS_STORE_ID), product_id: String(LS_PRODUCT_ANNUAL) })).toBe(true);
    expect(isOurProduct(null)).toBe(false);
  });

  it('a valid key of another product of our store never unlocks Pro', () => {
    expect(LS_PRODUCT_IDS).toEqual([1526762, 1414439]);
    const otherProduct = { valid: true, license_key: { status: 'active' }, meta: { store_id: LS_STORE_ID, product_id: 999 } };
    expect(interpretLemonSqueezy(200, otherProduct).kind).toBe('invalid');
    expect(interpretLemonSqueezy(200, { ...otherProduct, meta: { store_id: LS_STORE_ID } }).kind).toBe('invalid');
    expect(isOurProduct({ store_id: LS_STORE_ID, product_id: LS_PRODUCT_LIFETIME })).toBe(true);
  });

  it('annual: expired or disabled subscription is not Pro; lifetime (no expiry) stays Pro', () => {
    const annual = { store_id: LS_STORE_ID, product_id: LS_PRODUCT_ANNUAL, variant_id: 1 };
    const lifetime = { store_id: LS_STORE_ID, product_id: LS_PRODUCT_LIFETIME, variant_id: 1 };
    // Lemon Squeezy answers either valid:false + status, or valid:true with a non-active status.
    for (const valid of [false, true]) {
      const exp = interpretLemonSqueezy(200, { valid, error: valid ? null : 'This license key has expired.', license_key: { status: 'expired', expires_at: '2026-01-01T00:00:00Z' }, meta: annual });
      const dis = interpretLemonSqueezy(200, { valid, error: valid ? null : 'This license key is disabled.', license_key: { status: 'disabled' }, meta: annual });
      expect(exp.kind).toBe('expired');
      expect(dis.kind).toBe('revoked');
      expect(licenseGrantsPro(applyVerdict(active(), 'KEY', exp, 'lemonsqueezy', NOW), NOW)).toBe(false);
      expect(licenseGrantsPro(applyVerdict(active(), 'KEY', dis, 'lemonsqueezy', NOW), NOW)).toBe(false);
    }
    const life = interpretLemonSqueezy(200, { valid: true, license_key: { status: 'active', expires_at: null }, meta: lifetime });
    expect(life).toEqual({ kind: 'valid', expiresAt: null });
    let state = applyVerdict(noLicense(), 'LIFE', life, 'lemonsqueezy', NOW);
    for (let day = 1; day <= 3650; day += 365) {
      const at = NOW + day * DAY_MS;
      state = applyVerdict(state, 'LIFE', life, 'lemonsqueezy', at);
      expect(licenseGrantsPro(state, at)).toBe(true);
    }
  });

});

describe('applyVerdict', () => {
  it('valid refreshes both timestamps', () => {
    expect(applyVerdict(noLicense(), 'K', { kind: 'valid', expiresAt: null }, 'x2', NOW)).toMatchObject({
      key: 'K',
      status: 'active',
      lastValidAt: NOW,
      lastCheckedAt: NOW
    });
  });

  it('server unreachable never blocks: same key keeps its status (grace)', () => {
    const prev = active({ lastValidAt: NOW - 3 * DAY_MS });
    const next = applyVerdict(prev, 'KEY', { kind: 'unreachable' }, '', NOW);
    expect(next.status).toBe('active');
    expect(next.lastValidAt).toBe(prev.lastValidAt);
    expect(next.lastCheckedAt).toBe(NOW);
  });

  it('unreachable on a new key stores nothing (cannot grant Pro unverified)', () => {
    expect(applyVerdict(noLicense(), 'NEW', { kind: 'unreachable' }, '', NOW)).toEqual(noLicense());
  });

  it('explicit answers turn Pro off and keep the key for display', () => {
    expect(applyVerdict(active(), 'KEY', { kind: 'expired' }, 'lemonsqueezy', NOW)).toMatchObject({ key: 'KEY', status: 'expired' });
  });

  it('validateLicense sanitises storage', () => {
    expect(validateLicense({ key: ' K ', status: 'weird' })).toMatchObject({ key: 'K', status: 'invalid' });
    expect(validateLicense(null)).toEqual(noLicense());
  });
});
