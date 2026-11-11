// Storage schema (chrome.storage.local). Bump SCHEMA_VERSION and add a step in
// src/shared/migrations.ts whenever a key is renamed, removed or changes shape.

import { noLicense, type LicenseState } from './license';
import type { Rule } from './rules';
import { defaultShortcuts, type Shortcut } from './shortcuts';

export const SCHEMA_VERSION = 4;

/** Overlay top-left corner as a fraction (0–1) of the video's width/height. */
export interface OverlayPosition {
  x: number;
  y: number;
}

export interface SkipSilenceSettings {
  enabled: boolean;
  /** Loudness below which audio counts as silence (dBFS RMS). */
  thresholdDb: number;
  /** Silence must last this long before speeding up ("margin before"). */
  minSilenceMs: number;
  /** Speed used during silence. */
  silenceSpeed: number;
  /** After sound returns, stay at normal speed at least this long ("margin after"). */
  minSpeechMs: number;
}

export interface Checkpoint {
  id: string;
  time: number;
  formattedTime: string;
  label: string;
  pageTitle: string;
  url: string;
  createdAt: number;
}

export interface StoredState {
  schemaVersion: number;
  installDate: number;
  /** v4: server-validated license (replaces isPro / licenseKey / activatedAt). */
  license: LicenseState;
  defaultSpeed: number;
  hudEnabled: boolean;
  preservesPitch: boolean;
  loopVideo: boolean;
  activeTab: string;
  favoriteSpeed: number;
  videoCheckpoints: Record<string, Checkpoint[]>;
  // v2
  /** Increment used by the slower/faster shortcuts and popup fine buttons. */
  speedStep: number;
  /** Seconds jumped by rewind/advance. */
  seekSeconds: number;
  /** Start new pages at the last speed used (otherwise 1x). */
  rememberSpeed: boolean;
  /** Speed changes affect every media element in the frame, not just the active one. */
  applyToAll: boolean;
  overlayAutoHideMs: number;
  overlayPositions: Record<string, OverlayPosition>;
  shortcuts: Shortcut[];
  /** Domains where keyboard shortcuts are disabled (site keeps its own keys). */
  shortcutBlacklist: string[];
  // v3
  /** Speed rules (replace v1/v2 `domainSpeeds`). */
  rules: Rule[];
  skipSilence: SkipSilenceSettings;
  /** Speed while the hold-to-speed key is down. */
  holdSpeed: number;
  /** YouTube ads at 16x + muted, then restore. Opt-in. */
  youtubeAds: boolean;
  // v4
  /** Mirror settings to chrome.storage.sync (other devices signed into the same browser profile). */
  syncEnabled: boolean;
  /** Random id of this installation (tells our own sync writes apart from other devices'). */
  deviceId: string;
  reviewPrompt: ReviewPromptState;
}

export interface ReviewPromptState {
  /** waiting → (30 min saved) shown → done; "Not now" keeps it waiting until snoozedUntil. */
  state: 'waiting' | 'done';
  snoozedUntil: number;
}

export const SETTING_BOUNDS = {
  speedStep: { min: 0.01, max: 1, fallback: 0.1 },
  seekSeconds: { min: 1, max: 600, fallback: 10 },
  overlayAutoHideMs: { min: 500, max: 10000, fallback: 2000 },
  holdSpeed: { min: 0.1, max: 16, fallback: 2.5 },
  thresholdDb: { min: -70, max: -10, fallback: -42 },
  minSilenceMs: { min: 50, max: 3000, fallback: 350 },
  silenceSpeed: { min: 1.25, max: 16, fallback: 4 },
  minSpeechMs: { min: 0, max: 3000, fallback: 250 }
} as const;

/** Defaults for every key except installDate (set at install time). */
export function defaultState(): Omit<StoredState, 'installDate'> {
  return {
    schemaVersion: SCHEMA_VERSION,
    license: noLicense(),
    defaultSpeed: 1,
    hudEnabled: true,
    preservesPitch: true,
    loopVideo: false,
    activeTab: 'speed',
    favoriteSpeed: 2,
    videoCheckpoints: {},
    speedStep: SETTING_BOUNDS.speedStep.fallback,
    seekSeconds: SETTING_BOUNDS.seekSeconds.fallback,
    rememberSpeed: true,
    applyToAll: false,
    overlayAutoHideMs: SETTING_BOUNDS.overlayAutoHideMs.fallback,
    overlayPositions: {},
    shortcuts: defaultShortcuts(),
    shortcutBlacklist: [],
    rules: [],
    skipSilence: {
      enabled: false,
      thresholdDb: SETTING_BOUNDS.thresholdDb.fallback,
      minSilenceMs: SETTING_BOUNDS.minSilenceMs.fallback,
      silenceSpeed: SETTING_BOUNDS.silenceSpeed.fallback,
      minSpeechMs: SETTING_BOUNDS.minSpeechMs.fallback
    },
    holdSpeed: SETTING_BOUNDS.holdSpeed.fallback,
    youtubeAds: false,
    syncEnabled: true,
    deviceId: '',
    reviewPrompt: { state: 'waiting', snoozedUntil: 0 }
  };
}

export const STORAGE_KEYS = Object.keys({ installDate: 0, ...defaultState() }) as (keyof StoredState)[];
