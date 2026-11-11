// Pure storage migrations. The background worker runs migrate() on install/update and
// writes the result; keeping this pure makes it unit-testable without chrome.* APIs.
import { normalizeHostPattern } from './hosts';
import { newRuleId, validateRule, type Rule } from './rules';
import { addDefaultsForNewActions, migrateLegacyHotkeys, validateShortcut, type Shortcut } from './shortcuts';
import { normalizeMediaUrl } from './url';
import { SCHEMA_VERSION, SETTING_BOUNDS, defaultState, type OverlayPosition, type StoredState } from './storage';

/** Keys written by versions ≤ 1.5.1.8 that are no longer used. */
export const LEGACY_KEYS = [
  'is_pro',
  'license_key',
  'isLicensed',
  'preservePitch',
  'telemetry_client_id',
  // v1 → v2: replaced by `shortcuts`
  'customHotkeys',
  // v2 → v3: replaced by `rules`
  'domainSpeeds'
] as const;

export interface MigrationResult {
  set: Partial<StoredState>;
  remove: string[];
}

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const nonEmptyString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v : null;

function bounded(v: unknown, b: { min: number; max: number; fallback: number }): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, b.min), b.max) : b.fallback;
}

const fraction = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

function migrateShortcuts(raw: Raw, fromVersion: number): Shortcut[] {
  if (Array.isArray(raw.shortcuts)) {
    let list = raw.shortcuts.map(validateShortcut).filter((s): s is Shortcut => s !== null);
    // An explicitly empty list is a valid user choice (all shortcuts removed).
    if (list.length || raw.shortcuts.length === 0) {
      if (fromVersion < 3) list = addDefaultsForNewActions(list, ['hold', 'abRepeat']);
      return list;
    }
  }
  return migrateLegacyHotkeys(isObject(raw.customHotkeys) ? raw.customHotkeys : undefined);
}

function migrateRules(raw: Raw): Rule[] {
  const rules = Array.isArray(raw.rules) ? raw.rules.map(validateRule).filter((r): r is Rule => r !== null) : [];
  // v2 → v3: per-domain speeds become domain rules.
  if (isObject(raw.domainSpeeds)) {
    for (const [host, v] of Object.entries(raw.domainSpeeds)) {
      const speed = typeof v === 'number' ? v : parseFloat(String(v));
      const pattern = normalizeHostPattern(host);
      if (!Number.isFinite(speed) || speed <= 0 || !pattern) continue;
      if (rules.some((r) => r.type === 'domain' && r.pattern === pattern)) continue;
      rules.push({ id: newRuleId(), type: 'domain', pattern, speed });
    }
  }
  return rules;
}

/** v2 → v3: bookmark keys use normalizeMediaUrl (no tracking/timestamp params); merge collisions. */
function migrateCheckpoints(raw: unknown): StoredState['videoCheckpoints'] {
  if (!isObject(raw)) return {};
  const out: StoredState['videoCheckpoints'] = {};
  for (const [key, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue;
    const k = /^[a-z]+:\/\//i.test(key) ? normalizeMediaUrl(key) : key;
    const merged = [...(out[k] ?? []), ...(list as StoredState['videoCheckpoints'][string])];
    const seen = new Set<string>();
    out[k] = merged
      .filter((cp) => cp && typeof cp.time === 'number' && !seen.has(cp.id) && seen.add(cp.id))
      .sort((a, b) => a.time - b.time);
  }
  return out;
}

/**
 * Normalise whatever is in storage into the current schema.
 * Idempotent: running it on already-migrated data yields `set` with no changes of value.
 */
export function migrate(raw: Raw, now: number = Date.now()): MigrationResult {
  const defaults = defaultState();
  const set: Partial<StoredState> = {};
  const fromVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;

  // v0 → v1: unify duplicated license / pitch keys.
  set.isPro = raw.isPro === true || raw.is_pro === true;
  set.licenseKey = nonEmptyString(raw.licenseKey) ?? nonEmptyString(raw.license_key) ?? '';
  set.preservesPitch =
    typeof raw.preservesPitch === 'boolean'
      ? raw.preservesPitch
      : typeof raw.preservePitch === 'boolean'
        ? raw.preservePitch
        : defaults.preservesPitch;

  set.installDate = typeof raw.installDate === 'number' ? raw.installDate : now;
  set.activatedAt = typeof raw.activatedAt === 'number' ? raw.activatedAt : defaults.activatedAt;

  const speed = typeof raw.defaultSpeed === 'number' ? raw.defaultSpeed : parseFloat(String(raw.defaultSpeed));
  set.defaultSpeed = Number.isFinite(speed) ? speed : defaults.defaultSpeed;
  const fav = typeof raw.favoriteSpeed === 'number' ? raw.favoriteSpeed : parseFloat(String(raw.favoriteSpeed));
  set.favoriteSpeed = Number.isFinite(fav) && fav > 0 ? fav : defaults.favoriteSpeed;

  set.hudEnabled = typeof raw.hudEnabled === 'boolean' ? raw.hudEnabled : defaults.hudEnabled;
  set.loopVideo = typeof raw.loopVideo === 'boolean' ? raw.loopVideo : defaults.loopVideo;
  set.activeTab = typeof raw.activeTab === 'string' && raw.activeTab ? raw.activeTab : defaults.activeTab;

  set.videoCheckpoints = migrateCheckpoints(raw.videoCheckpoints);

  // v1 → v2: settings for shortcuts, seek, overlay.
  set.speedStep = bounded(raw.speedStep, SETTING_BOUNDS.speedStep);
  set.seekSeconds = bounded(raw.seekSeconds, SETTING_BOUNDS.seekSeconds);
  set.overlayAutoHideMs = bounded(raw.overlayAutoHideMs, SETTING_BOUNDS.overlayAutoHideMs);
  set.rememberSpeed = typeof raw.rememberSpeed === 'boolean' ? raw.rememberSpeed : defaults.rememberSpeed;
  set.applyToAll = typeof raw.applyToAll === 'boolean' ? raw.applyToAll : defaults.applyToAll;
  set.shortcuts = migrateShortcuts(raw, fromVersion);
  set.shortcutBlacklist = Array.isArray(raw.shortcutBlacklist)
    ? [...new Set(raw.shortcutBlacklist.filter((h): h is string => typeof h === 'string').map(normalizeHostPattern).filter(Boolean))]
    : [];
  set.overlayPositions = {};
  if (isObject(raw.overlayPositions)) {
    for (const [host, pos] of Object.entries(raw.overlayPositions)) {
      if (isObject(pos) && fraction(pos.x) && fraction(pos.y)) {
        set.overlayPositions[host] = { x: pos.x, y: pos.y } as OverlayPosition;
      }
    }
  }

  // v2 → v3: Pro features.
  set.rules = migrateRules(raw);
  const ss = isObject(raw.skipSilence) ? raw.skipSilence : {};
  set.skipSilence = {
    enabled: ss.enabled === true,
    thresholdDb: bounded(ss.thresholdDb, SETTING_BOUNDS.thresholdDb),
    minSilenceMs: bounded(ss.minSilenceMs, SETTING_BOUNDS.minSilenceMs),
    silenceSpeed: bounded(ss.silenceSpeed, SETTING_BOUNDS.silenceSpeed),
    minSpeechMs: bounded(ss.minSpeechMs, SETTING_BOUNDS.minSpeechMs)
  };
  set.holdSpeed = bounded(raw.holdSpeed, SETTING_BOUNDS.holdSpeed);
  set.youtubeAds = raw.youtubeAds === true;

  set.schemaVersion = SCHEMA_VERSION;

  const remove = LEGACY_KEYS.filter((k) => k in raw);
  return { set, remove };
}
