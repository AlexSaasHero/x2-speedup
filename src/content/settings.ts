// Live view of the settings the content script needs, normalised through the schema migration.
import { isPro } from '../shared/entitlement';
import { migrate } from '../shared/migrations';
import type { StoredState } from '../shared/storage';

export type ContentSettings = Omit<StoredState, 'videoCheckpoints' | 'activeTab' | 'installDate' | 'activatedAt'> & {
  pro: boolean;
};

const KEYS = [
  'schemaVersion',
  'isPro',
  'licenseKey',
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
  'shortcutBlacklist',
  // read only so migrate() can convert un-migrated legacy data in-memory
  'customHotkeys',
  'domainSpeeds',
  'is_pro',
  'license_key',
  'preservePitch'
] as const;

function normalise(raw: Record<string, unknown>): ContentSettings {
  const s = migrate(raw).set as StoredState;
  return {
    schemaVersion: s.schemaVersion,
    isPro: s.isPro,
    licenseKey: s.licenseKey,
    pro: isPro(s),
    defaultSpeed: s.defaultSpeed,
    rules: s.rules,
    skipSilence: s.skipSilence,
    holdSpeed: s.holdSpeed,
    youtubeAds: s.youtubeAds,
    hudEnabled: s.hudEnabled,
    preservesPitch: s.preservesPitch,
    loopVideo: s.loopVideo,
    favoriteSpeed: s.favoriteSpeed,
    speedStep: s.speedStep,
    seekSeconds: s.seekSeconds,
    rememberSpeed: s.rememberSpeed,
    applyToAll: s.applyToAll,
    overlayAutoHideMs: s.overlayAutoHideMs,
    overlayPositions: s.overlayPositions,
    shortcuts: s.shortcuts,
    shortcutBlacklist: s.shortcutBlacklist
  };
}

export async function loadSettings(): Promise<ContentSettings> {
  return normalise(await chrome.storage.local.get([...KEYS]));
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
