// Live view of the settings the content script needs.
//
// The service worker migrates storage to the current schema on install/update, so here we only
// need a light, defensive read (type checks + defaults) instead of bundling the whole migration
// into a script that runs in every frame. If the stored schema is older (the page loaded in the
// few milliseconds before the worker finished migrating), we wait briefly for the migration.
import { isPro } from '../shared/entitlement';
import { validateShortcut, type Shortcut } from '../shared/shortcuts';
import { SCHEMA_VERSION, defaultState, type StoredState } from '../shared/storage';

export type ContentSettings = Omit<
  StoredState,
  'videoCheckpoints' | 'activeTab' | 'installDate' | 'license' | 'syncEnabled' | 'deviceId' | 'reviewPrompt'
> & {
  pro: boolean;
};

const KEYS = [
  'schemaVersion',
  'license',
  'defaultSpeed',
  'rules',
  'skipSilence',
  'holdSpeed',
  'youtubeAds',
  'hudEnabled',
  'preservesPitch',
  'loopVideo',
  'favoriteSpeed',
  'speedStep',
  'seekSeconds',
  'rememberSpeed',
  'applyToAll',
  'overlayAutoHideMs',
  'overlayPositions',
  'shortcuts',
  'shortcutBlacklist'
] as const;

const MIGRATION_WAIT_MS = 2000;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Value if it has the same JS type as the default, otherwise the default. */
function pick<T>(v: unknown, fallback: T): T {
  if (Array.isArray(fallback)) return (Array.isArray(v) ? v : fallback) as T;
  if (isObj(fallback)) return (isObj(v) ? { ...fallback, ...v } : fallback) as T;
  if (typeof fallback === 'number') return (typeof v === 'number' && Number.isFinite(v) ? v : fallback) as T;
  return (typeof v === typeof fallback ? v : fallback) as T;
}

export function normaliseContentSettings(raw: Record<string, unknown>): ContentSettings {
  const d = defaultState();
  return {
    schemaVersion: pick(raw.schemaVersion, d.schemaVersion),
    pro: isPro({ license: raw.license }),
    defaultSpeed: pick(raw.defaultSpeed, d.defaultSpeed),
    rules: pick(raw.rules, d.rules),
    skipSilence: pick(raw.skipSilence, d.skipSilence),
    holdSpeed: pick(raw.holdSpeed, d.holdSpeed),
    youtubeAds: pick(raw.youtubeAds, d.youtubeAds),
    hudEnabled: pick(raw.hudEnabled, d.hudEnabled),
    preservesPitch: pick(raw.preservesPitch, d.preservesPitch),
    loopVideo: pick(raw.loopVideo, d.loopVideo),
    favoriteSpeed: pick(raw.favoriteSpeed, d.favoriteSpeed),
    speedStep: pick(raw.speedStep, d.speedStep),
    seekSeconds: pick(raw.seekSeconds, d.seekSeconds),
    rememberSpeed: pick(raw.rememberSpeed, d.rememberSpeed),
    applyToAll: pick(raw.applyToAll, d.applyToAll),
    overlayAutoHideMs: pick(raw.overlayAutoHideMs, d.overlayAutoHideMs),
    overlayPositions: pick(raw.overlayPositions, d.overlayPositions),
    shortcuts: Array.isArray(raw.shortcuts)
      ? raw.shortcuts.map(validateShortcut).filter((s): s is Shortcut => s !== null)
      : d.shortcuts,
    shortcutBlacklist: pick(raw.shortcutBlacklist, d.shortcutBlacklist).filter((h): h is string => typeof h === 'string')
  };
}

function waitForMigration(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      chrome.storage.onChanged.removeListener(listener);
      clearTimeout(timer);
      resolve();
    };
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.schemaVersion) done();
    };
    const timer = setTimeout(done, MIGRATION_WAIT_MS);
    chrome.storage.onChanged.addListener(listener);
  });
}

export async function loadSettings(): Promise<ContentSettings> {
  let raw = await chrome.storage.local.get([...KEYS]);
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    await waitForMigration();
    raw = await chrome.storage.local.get([...KEYS]);
  }
  return normaliseContentSettings(raw);
}

/**
 * Calls `onChange(next, changedKeys)` whenever a relevant key changes.
 * `defaultSpeed` is intentionally ignored: a speed chosen in one tab must not move other tabs.
 */
export function watchSettings(onChange: (next: ContentSettings, changed: Set<string>) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const changed = new Set(Object.keys(changes).filter((k) => (KEYS as readonly string[]).includes(k) && k !== 'defaultSpeed'));
    if (!changed.size) return;
    loadSettings().then((next) => onChange(next, changed)).catch(() => {});
  });
}
