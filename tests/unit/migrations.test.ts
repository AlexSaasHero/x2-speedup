import { describe, expect, it } from 'vitest';
import { LEGACY_KEYS, migrate } from '../../src/shared/migrations';
import { DEFAULT_HOTKEYS, SCHEMA_VERSION, STORAGE_KEYS, defaultState } from '../../src/shared/storage';

const NOW = 1_700_000_000_000;

describe('migrate', () => {
  it('fills every key on a fresh install', () => {
    const { set, remove } = migrate({}, NOW);
    expect(remove).toEqual([]);
    expect(set).toEqual({ ...defaultState(), installDate: NOW });
    expect(Object.keys(set).sort()).toEqual([...STORAGE_KEYS].sort());
  });

  it('unifies legacy license keys from v1.5.1.x', () => {
    const { set, remove } = migrate(
      {
        is_pro: true,
        isPro: false,
        isLicensed: true,
        license_key: 'PRO-1234',
        licenseKey: '',
        telemetry_client_id: 'abc',
        installDate: 123
      },
      NOW
    );
    expect(set.isPro).toBe(true);
    expect(set.licenseKey).toBe('PRO-1234');
    expect(set.installDate).toBe(123);
    expect(remove.sort()).toEqual(['isLicensed', 'is_pro', 'license_key', 'telemetry_client_id'].sort());
  });

  it('prefers licenseKey over license_key when both are set', () => {
    expect(migrate({ licenseKey: 'NEW', license_key: 'OLD' }).set.licenseKey).toBe('NEW');
  });

  it('keeps preservesPitch, falling back to legacy preservePitch', () => {
    expect(migrate({ preservePitch: false }).set.preservesPitch).toBe(false);
    expect(migrate({ preservesPitch: true, preservePitch: false }).set.preservesPitch).toBe(true);
  });

  it('keeps user hotkeys and fills missing ones', () => {
    const { set } = migrate({ customHotkeys: { speedUp: 'd', speedDown: 7 } });
    expect(set.customHotkeys).toEqual({ ...DEFAULT_HOTKEYS, speedUp: 'd' });
  });

  it('drops non-numeric domain speeds and parses string speeds', () => {
    const { set } = migrate({ domainSpeeds: { 'a.com': '1.5', 'b.com': 'x', 'c.com': 2 }, defaultSpeed: '1.75' });
    expect(set.domainSpeeds).toEqual({ 'a.com': 1.5, 'c.com': 2 });
    expect(set.defaultSpeed).toBe(1.75);
  });

  it('is idempotent', () => {
    const first = migrate({ is_pro: true, license_key: 'KEY-1', favoriteSpeed: 3 }, NOW).set;
    const second = migrate(first as Record<string, unknown>, NOW + 1);
    expect(second.set).toEqual(first);
    expect(second.remove).toEqual([]);
    expect(first.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('only lists legacy keys that are present', () => {
    expect(LEGACY_KEYS).toContain('telemetry_client_id');
    expect(migrate({ preservePitch: true }).remove).toEqual(['preservePitch']);
  });
});
