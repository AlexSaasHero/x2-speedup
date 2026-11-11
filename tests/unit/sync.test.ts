import { describe, expect, it } from 'vitest';
import { migrate } from '../../src/shared/migrations';
import { binding, defaultShortcuts } from '../../src/shared/shortcuts';
import { SCHEMA_VERSION, type StoredState } from '../../src/shared/storage';
import {
  EXPORT_FORMAT,
  SYNC_CHUNK_CHARS,
  SYNC_KEYS,
  SYNC_META_KEY,
  buildExport,
  fromSyncItems,
  hashString,
  keyFromKeyCode,
  parseImport,
  pickSynced,
  stableStringify,
  toSyncItems
} from '../../src/shared/sync';

const state = () => migrate({}).set as StoredState;

describe('sync chunking', () => {
  it('round-trips and never syncs license, stats, bookmarks or device id', () => {
    const s = { ...state(), speedStep: 0.25 };
    const picked = pickSynced(s);
    expect(Object.keys(picked).sort()).toEqual([...SYNC_KEYS].sort());
    for (const k of ['license', 'videoCheckpoints', 'deviceId', 'overlayPositions', 'defaultSpeed']) expect(picked).not.toHaveProperty(k);
    const items = toSyncItems(picked, 'dev-A', 1)!;
    const back = fromSyncItems(items)!;
    expect(back.meta.device).toBe('dev-A');
    expect(back.settings).toEqual(picked);
  });

  it('splits large settings into chunks under the 8 KB item limit', () => {
    const rules = Array.from({ length: 300 }, (_, i) => ({ id: `r${i}`, type: 'url' as const, pattern: `example.com/course/${i}/*`, speed: 1.5 }));
    const items = toSyncItems({ ...pickSynced(state()), rules }, 'd')!;
    const meta = items[SYNC_META_KEY];
    expect(meta.chunks).toBeGreaterThan(1);
    for (const [k, v] of Object.entries(items)) {
      expect(new TextEncoder().encode(k + JSON.stringify(v)).length).toBeLessThan(8192);
    }
    expect(fromSyncItems(items)!.settings.rules).toHaveLength(300);
    expect(SYNC_CHUNK_CHARS).toBeLessThan(8192 / 1.2);
  });

  it('refuses settings over the total quota and corrupted/incomplete data', () => {
    const huge = Array.from({ length: 3000 }, (_, i) => ({ id: `r${i}`, type: 'url' as const, pattern: `x.com/${'a'.repeat(30)}${i}`, speed: 2 }));
    expect(toSyncItems({ rules: huge }, 'd')).toBeNull();
    const items = toSyncItems(pickSynced(state()), 'd')!;
    expect(fromSyncItems({ ...items, cfg_0: `${items.cfg_0}x` })).toBeNull();
    const { cfg_0: _drop, ...missing } = items;
    expect(fromSyncItems(missing)).toBeNull();
  });

  it('stable stringify/hash ignore key order', () => {
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
    expect(hashString(stableStringify({ a: 1, b: 2 }))).toBe(hashString(stableStringify({ b: 2, a: 1 })));
  });
});

describe('export / import', () => {
  it('round-trips an export', () => {
    const s = { ...state(), seekSeconds: 30, shortcutBlacklist: ['a.com'] };
    const res = parseImport(JSON.stringify(buildExport(s)));
    expect(res.ok && res.source).toBe('speedup');
    if (res.ok) expect(res.settings).toMatchObject({ seekSeconds: 30, shortcutBlacklist: ['a.com'] });
  });

  it('validates through the schema (bounds, unknown keys dropped)', () => {
    const res = parseImport(JSON.stringify({ format: EXPORT_FORMAT, version: 2, settings: { seekSeconds: 9999, license: { key: 'x' }, evil: 1 } }));
    expect(res).toMatchObject({ ok: true, settings: { seekSeconds: 600 } });
    if (res.ok) {
      expect(res.settings).not.toHaveProperty('license');
      expect(res.settings).not.toHaveProperty('evil');
    }
  });

  it('rejects bad JSON, unknown formats and newer versions', () => {
    expect(parseImport('{')).toEqual({ ok: false, error: 'json' });
    expect(parseImport('{"hello":1}')).toEqual({ ok: false, error: 'format' });
    expect(parseImport(JSON.stringify({ format: EXPORT_FORMAT, version: SCHEMA_VERSION + 1, settings: {} }))).toEqual({ ok: false, error: 'version' });
  });
});

describe('Video Speed Controller import', () => {
  const vsc = {
    speed: 1.5,
    rememberSpeed: false,
    startHidden: true,
    keyBindings: [
      { action: 'slower', key: 83, value: 0.25, force: false, predefined: true },
      { action: 'faster', key: 68, value: 0.25, force: false, predefined: true },
      { action: 'rewind', key: 90, value: 5, force: false, predefined: true },
      { action: 'advance', key: 88, value: 5, force: false, predefined: true },
      { action: 'reset', key: 82, value: 1, force: false, predefined: true },
      { action: 'fast', key: 71, value: 2.5, force: false, predefined: true },
      { action: 'display', key: 86, value: 0, force: false, predefined: true },
      { action: 'mark', key: 77, value: 0, force: false, predefined: true },
      { action: 'louder', key: 999, value: 0.1, force: false, predefined: false }
    ],
    blacklist: 'www.instagram.com\ntwitter.com\n/(.+)netflix.com/\n'
  };

  it('maps bindings, values, blacklist and flags', () => {
    const res = parseImport(JSON.stringify(vsc));
    expect(res.ok && res.source).toBe('vsc');
    if (!res.ok) return;
    expect(res.settings).toMatchObject({ speedStep: 0.25, seekSeconds: 5, favoriteSpeed: 2.5, rememberSpeed: false, hudEnabled: false });
    expect(res.settings.shortcutBlacklist).toEqual(['instagram.com', 'twitter.com']);
    const sc = res.settings.shortcuts!;
    expect(sc.slice(0, 7)).toEqual(defaultShortcuts().slice(0, 7).sort((a, b) => ['slower', 'faster', 'rewind', 'advance', 'reset', 'preferred', 'toggleOverlay'].indexOf(a.action) - ['slower', 'faster', 'rewind', 'advance', 'reset', 'preferred', 'toggleOverlay'].indexOf(b.action)));
    // Pro actions VSC does not have get our defaults.
    expect(sc.some((s) => s.action === 'hold')).toBe(true);
    expect(res.notes).toEqual(expect.arrayContaining(['skipped:mark', 'skipped:louder', 'regex:/(.+)netflix.com/']));
  });

  it('accepts the settings wrapped under "settings" and maps key codes', () => {
    const res = parseImport(JSON.stringify({ settings: { keyBindings: [{ action: 'faster', key: 190, value: 0.1 }] } }));
    expect(res.ok && res.settings.shortcuts![0]).toEqual(binding('faster', '.'));
    expect(keyFromKeyCode(65)).toBe('a');
    expect(keyFromKeyCode(39)).toBe('ArrowRight');
    expect(keyFromKeyCode(112)).toBe('F1');
    expect(keyFromKeyCode(5)).toBeNull();
  });
});
