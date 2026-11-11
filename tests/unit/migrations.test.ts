import { describe, expect, it } from 'vitest';
import { LEGACY_KEYS, migrate } from '../../src/shared/migrations';
import { binding, defaultShortcuts } from '../../src/shared/shortcuts';
import { SCHEMA_VERSION, STORAGE_KEYS, defaultState } from '../../src/shared/storage';

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

  it('v1 → v2: users with the old default hotkeys keep ] and [ on top of the VSC defaults', () => {
    const { set, remove } = migrate({ customHotkeys: { speedUp: ']', speedDown: '[', resetSpeed: 'r', favoriteSpeed: 'g' } });
    expect(set.shortcuts).toEqual([...defaultShortcuts(), binding('faster', ']'), binding('slower', '[')]);
    expect(remove).toContain('customHotkeys');
  });

  it('v1 → v2: a custom key wins over a new default bound to another action', () => {
    const { set } = migrate({ customHotkeys: { speedUp: 'z', speedDown: 7 } });
    const actionsForZ = set.shortcuts!.filter((s) => s.key === 'z').map((s) => s.action);
    expect(actionsForZ).toEqual(['faster']);
    expect(set.shortcuts!.some((s) => s.action === 'slower' && s.key === '[')).toBe(true);
  });

  it('fresh install gets exactly the VSC defaults', () => {
    expect(migrate({}).set.shortcuts).toEqual(defaultShortcuts());
  });

  it('keeps a valid shortcuts list (even empty) and drops invalid entries', () => {
    expect(migrate({ schemaVersion: SCHEMA_VERSION, shortcuts: [] }).set.shortcuts).toEqual([]);
    const { set } = migrate({ schemaVersion: SCHEMA_VERSION, shortcuts: [binding('rewind', 'j'), { action: 'nope', key: 'k' }, { action: 'faster' }] });
    expect(set.shortcuts).toEqual([binding('rewind', 'j')]);
  });

  it('bounds numeric settings and cleans lists', () => {
    const { set } = migrate({
      speedStep: 5,
      seekSeconds: 'x',
      overlayAutoHideMs: 100,
      shortcutBlacklist: ['https://www.YouTube.com/watch', 3, 'youtube.com', ''],
      overlayPositions: { 'a.com': { x: 0.5, y: 0.2 }, 'b.com': { x: 2, y: 0 }, 'c.com': 'bad' }
    });
    expect(set.speedStep).toBe(1);
    expect(set.seekSeconds).toBe(10);
    expect(set.overlayAutoHideMs).toBe(500);
    expect(set.shortcutBlacklist).toEqual(['youtube.com']);
    expect(set.overlayPositions).toEqual({ 'a.com': { x: 0.5, y: 0.2 } });
  });

  it('v2 → v3: domain speeds become domain rules (invalid ones dropped)', () => {
    const { set, remove } = migrate({ domainSpeeds: { 'www.a.com': '1.5', 'b.com': 'x', 'c.com': 2 }, defaultSpeed: '1.75' });
    expect(set.rules!.map(({ type, pattern, speed }) => ({ type, pattern, speed }))).toEqual([
      { type: 'domain', pattern: 'a.com', speed: 1.5 },
      { type: 'domain', pattern: 'c.com', speed: 2 }
    ]);
    expect(remove).toContain('domainSpeeds');
    expect(set.defaultSpeed).toBe(1.75);
  });

  it('v2 → v3: existing shortcut lists get the new Pro actions unless the key is taken', () => {
    const v2 = [binding('faster', 'd'), binding('slower', 'a', { shift: true })];
    const { set } = migrate({ schemaVersion: 2, shortcuts: v2 });
    expect(set.shortcuts).toEqual([...v2, binding('hold', 'f', { shift: true })]);
    // Already at v3: an intentionally removed binding is not re-added.
    expect(migrate({ schemaVersion: 3, shortcuts: v2 }).set.shortcuts).toEqual(v2);
  });

  it('v2 → v3: bookmark keys are normalised and merged', () => {
    const cp = (id: string, time: number) => ({ id, time, formattedTime: '', label: '', pageTitle: '', url: '', createdAt: 0 });
    const { set } = migrate({
      videoCheckpoints: {
        'https://www.youtube.com/watch?v=abc&t=30s': [cp('1', 30)],
        'https://youtu.be/abc': [cp('2', 10), cp('1', 30)]
      }
    });
    expect(Object.keys(set.videoCheckpoints!)).toEqual(['youtube.com/watch?v=abc']);
    expect(set.videoCheckpoints!['youtube.com/watch?v=abc'].map((c) => c.id)).toEqual(['2', '1']);
  });

  it('v3 Pro settings are bounded with safe defaults (skip silence off, ads off)', () => {
    const { set } = migrate({ skipSilence: { enabled: true, thresholdDb: -200, silenceSpeed: 99 }, holdSpeed: 'x', youtubeAds: 'yes' });
    expect(set.skipSilence).toEqual({ enabled: true, thresholdDb: -70, minSilenceMs: 350, silenceSpeed: 16, minSpeechMs: 250 });
    expect(set.holdSpeed).toBe(2.5);
    expect(set.youtubeAds).toBe(false);
    expect(migrate({}).set.skipSilence!.enabled).toBe(false);
  });

  it('is idempotent', () => {
    const first = migrate({ is_pro: true, license_key: 'KEY-1', favoriteSpeed: 3 }, NOW).set;
    const second = migrate(first as Record<string, unknown>, NOW + 1);
    expect(second.set).toEqual(first);
    expect(second.remove).toEqual([]);
    expect(first.schemaVersion).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(3);
  });

  it('only lists legacy keys that are present', () => {
    expect(LEGACY_KEYS).toContain('telemetry_client_id');
    expect(migrate({ preservePitch: true }).remove).toEqual(['preservePitch']);
  });
});
