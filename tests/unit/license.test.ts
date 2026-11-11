import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  LICENSE_GRACE_MS,
  applyVerdict,
  combineVerdicts,
  interpretLemonSqueezy,
  interpretX2,
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
  it('our endpoint', () => {
    expect(interpretX2(200, { status: 'valid' })).toEqual({ kind: 'valid', expiresAt: null });
    expect(interpretX2(200, { valid: true, expires_at: '2030-01-01T00:00:00Z' })).toEqual({ kind: 'valid', expiresAt: Date.parse('2030-01-01T00:00:00Z') });
    expect(interpretX2(200, { status: 'expired' })).toEqual({ kind: 'expired' });
    expect(interpretX2(403, { valid: false, error: 'License key disabled' })).toEqual({ kind: 'revoked' });
    expect(interpretX2(400, { valid: false })).toEqual({ kind: 'invalid' });
    for (const s of [0, 404, 429, 500, 503]) expect(interpretX2(s, null).kind).toBe('unreachable');
  });

  it('Lemon Squeezy', () => {
    expect(interpretLemonSqueezy(200, { valid: true, license_key: { status: 'active' } }).kind).toBe('valid');
    expect(interpretLemonSqueezy(200, { valid: false, license_key: { status: 'expired' } }).kind).toBe('expired');
    expect(interpretLemonSqueezy(200, { valid: false, license_key: { status: 'disabled' } }).kind).toBe('revoked');
    expect(interpretLemonSqueezy(404, { valid: false, error: 'license_key not found.' }).kind).toBe('invalid');
    expect(interpretLemonSqueezy(200, { valid: true, license_key: { status: 'active', activation_limit: 2, activation_usage: 3 } }).kind).toBe('limit');
    expect(interpretLemonSqueezy(0, null).kind).toBe('unreachable');
  });

  it('combination: either valid wins, else the most specific answer, else unreachable', () => {
    expect(combineVerdicts({ kind: 'invalid' }, { kind: 'valid', expiresAt: null }).kind).toBe('valid');
    expect(combineVerdicts({ kind: 'unreachable' }, { kind: 'expired' }).kind).toBe('expired');
    expect(combineVerdicts({ kind: 'invalid' }, { kind: 'revoked' }).kind).toBe('revoked');
    expect(combineVerdicts({ kind: 'unreachable' }, { kind: 'unreachable' }).kind).toBe('unreachable');
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
