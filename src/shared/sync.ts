// Settings portability: chrome.storage.sync mirroring (chunked), JSON export/import, and import
// from Video Speed Controller. Pure functions; chrome.* calls live in src/background/sync.ts and
// src/options/index.ts.
import { normalizeHostPattern } from './hosts';
import { migrate } from './migrations';
import { binding, type Shortcut, type ShortcutAction } from './shortcuts';
import { SCHEMA_VERSION, type StoredState } from './storage';

/** Settings that follow the user across devices. Not synced: license, stats, bookmarks, positions, device id. */
export const SYNC_KEYS = [
  'speedStep',
  'seekSeconds',
  'rememberSpeed',
  'applyToAll',
  'favoriteSpeed',
  'preservesPitch',
  'loopVideo',
  'hudEnabled',
  'overlayAutoHideMs',
  'shortcuts',
  'shortcutBlacklist',
  'rules',
  'skipSilence',
  'holdSpeed',
  'youtubeAds'
] as const satisfies readonly (keyof StoredState)[];

export type SyncedSettings = Pick<StoredState, (typeof SYNC_KEYS)[number]>;

export function pickSynced(state: Partial<StoredState>): Partial<SyncedSettings> {
  const out: Record<string, unknown> = {};
  for (const k of SYNC_KEYS) if (state[k] !== undefined) out[k] = state[k];
  return out as Partial<SyncedSettings>;
}

/** Stable JSON (sorted keys) so equal settings always hash equally. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

/** FNV-1a 32-bit — change detection only, not security. */
export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ---- chrome.storage.sync chunking ------------------------------------------------------------
// Limits: 8,192 bytes per item (key + JSON value), 102,400 bytes total, 512 items.

export const SYNC_META_KEY = 'cfg_meta';
export const SYNC_CHUNK_PREFIX = 'cfg_';
/** Characters per chunk; JSON-escaping of a string chunk adds a little, so stay well under 8 KB. */
export const SYNC_CHUNK_CHARS = 6000;
/** Keep a safety margin under the 100 KB total quota. */
export const SYNC_MAX_TOTAL_CHARS = 90_000;

export interface SyncMeta {
  v: number;
  chunks: number;
  hash: string;
  updatedAt: number;
  device: string;
}

export type SyncPayload = Record<string, unknown> & { [SYNC_META_KEY]: SyncMeta };

export function toSyncItems(settings: Partial<SyncedSettings>, device: string, now = Date.now()): SyncPayload | null {
  const json = stableStringify(settings);
  if (json.length > SYNC_MAX_TOTAL_CHARS) return null;
  const items: Record<string, unknown> = {};
  let chunks = 0;
  for (let i = 0; i < json.length || chunks === 0; i += SYNC_CHUNK_CHARS) {
    items[`${SYNC_CHUNK_PREFIX}${chunks}`] = json.slice(i, i + SYNC_CHUNK_CHARS);
    chunks++;
  }
  return { ...items, [SYNC_META_KEY]: { v: SCHEMA_VERSION, chunks, hash: hashString(json), updatedAt: now, device } };
}

export function chunkKeys(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${SYNC_CHUNK_PREFIX}${i}`);
}

/** Reassemble; null when incomplete or corrupted (hash mismatch) — then nothing is applied. */
export function fromSyncItems(items: Record<string, unknown>): { meta: SyncMeta; settings: Partial<SyncedSettings> } | null {
  const meta = items[SYNC_META_KEY] as SyncMeta | undefined;
  if (!meta || typeof meta.chunks !== 'number' || meta.chunks < 1) return null;
  let json = '';
  for (const k of chunkKeys(meta.chunks)) {
    if (typeof items[k] !== 'string') return null;
    json += items[k];
  }
  if (hashString(json) !== meta.hash) return null;
  try {
    return { meta, settings: normalizeSynced(JSON.parse(json), meta.v) };
  } catch {
    return null;
  }
}

/** Validate foreign/older settings through the schema migration and keep only synced keys. */
export function normalizeSynced(raw: unknown, fromVersion: number): Partial<SyncedSettings> {
  if (!raw || typeof raw !== 'object') return {};
  const present = SYNC_KEYS.filter((k) => k in (raw as object));
  const migrated = migrate({ ...(raw as object), schemaVersion: fromVersion }).set;
  const out: Record<string, unknown> = {};
  for (const k of present) out[k] = migrated[k];
  return out as Partial<SyncedSettings>;
}

// ---- JSON export / import --------------------------------------------------------------------

export const EXPORT_FORMAT = 'speedup-video-pro-settings';

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  settings: Partial<SyncedSettings>;
}

export function buildExport(state: Partial<StoredState>, now = new Date()): ExportFile {
  return { format: EXPORT_FORMAT, version: SCHEMA_VERSION, exportedAt: now.toISOString(), settings: pickSynced(state) };
}

export type ImportResult =
  | { ok: true; source: 'speedup' | 'vsc'; settings: Partial<SyncedSettings>; notes: string[] }
  | { ok: false; error: 'json' | 'format' | 'version' };

export function parseImport(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'json' };
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'format' };
  const d = data as Record<string, unknown>;
  if (d.format === EXPORT_FORMAT) {
    if (typeof d.version !== 'number' || d.version < 1) return { ok: false, error: 'format' };
    if (d.version > SCHEMA_VERSION) return { ok: false, error: 'version' };
    if (!d.settings || typeof d.settings !== 'object') return { ok: false, error: 'format' };
    return { ok: true, source: 'speedup', settings: normalizeSynced(d.settings, d.version), notes: [] };
  }
  const vsc = fromVideoSpeedController(d);
  return vsc ? { ok: true, source: 'vsc', ...vsc } : { ok: false, error: 'format' };
}

// ---- Video Speed Controller import -----------------------------------------------------------
// VSC stores { keyBindings: [{ action, key: <keyCode>, value, force, predefined }], blacklist:
// "host\nhost", rememberSpeed, startHidden, … } in chrome.storage.sync; users can paste that JSON
// (or an export wrapping it under `settings`).

const VSC_ACTIONS: Record<string, ShortcutAction> = {
  slower: 'slower',
  faster: 'faster',
  reset: 'reset',
  fast: 'preferred',
  rewind: 'rewind',
  advance: 'advance',
  display: 'toggleOverlay'
};

const KEYCODE_KEYS: Record<number, string> = {
  32: ' ', 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown',
  186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '`', 219: '[', 220: '\\', 221: ']', 222: "'"
};

export function keyFromKeyCode(code: number): string | null {
  if (code >= 65 && code <= 90) return String.fromCharCode(code).toLowerCase();
  if (code >= 48 && code <= 57) return String.fromCharCode(code);
  if (code >= 96 && code <= 105) return String(code - 96);
  if (code >= 112 && code <= 123) return `F${code - 111}`;
  return KEYCODE_KEYS[code] ?? null;
}

export function fromVideoSpeedController(raw: Record<string, unknown>): { settings: Partial<SyncedSettings>; notes: string[] } | null {
  const d = (raw.settings && typeof raw.settings === 'object' ? raw.settings : raw) as Record<string, unknown>;
  if (!Array.isArray(d.keyBindings)) return null;
  const notes: string[] = [];
  const shortcuts: Shortcut[] = [];
  const settings: Partial<SyncedSettings> = {};
  for (const kb of d.keyBindings as Record<string, unknown>[]) {
    const vscAction = String(kb?.action ?? '');
    const action = VSC_ACTIONS[vscAction];
    const key = typeof kb?.key === 'number' ? keyFromKeyCode(kb.key) : null;
    if (!action) {
      if (vscAction) notes.push(`skipped:${vscAction}`);
      continue;
    }
    if (!key) {
      notes.push(`nokey:${vscAction}`);
      continue;
    }
    shortcuts.push(binding(action, key));
    const value = Number(kb.value);
    if (Number.isFinite(value) && value > 0) {
      if (action === 'faster' || action === 'slower') settings.speedStep = value;
      if (action === 'rewind' || action === 'advance') settings.seekSeconds = value;
      if (action === 'preferred') settings.favoriteSpeed = value;
    }
  }
  settings.shortcuts = shortcuts;
  if (typeof d.blacklist === 'string') {
    const hosts: string[] = [];
    for (const line of d.blacklist.split(/\r?\n/)) {
      const l = line.trim();
      if (!l) continue;
      if (l.startsWith('/')) {
        notes.push(`regex:${l}`);
        continue;
      }
      const h = normalizeHostPattern(l);
      if (h) hosts.push(h);
    }
    settings.shortcutBlacklist = [...new Set(hosts)];
  }
  if (typeof d.rememberSpeed === 'boolean') settings.rememberSpeed = d.rememberSpeed;
  if (typeof d.startHidden === 'boolean') settings.hudEnabled = !d.startHidden;
  // Treat as a pre-v3 list so actions VSC doesn't have (hold, A-B) get their defaults.
  return { settings: normalizeSynced(settings, 2), notes };
}
