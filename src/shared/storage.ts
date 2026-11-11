// Storage schema (chrome.storage.local). Bump SCHEMA_VERSION and add a step in
// src/shared/migrations.ts whenever a key is renamed, removed or changes shape.

import { defaultShortcuts, type Shortcut } from './shortcuts';

export const SCHEMA_VERSION = 2;

/** Overlay top-left corner as a fraction (0–1) of the video's width/height. */
export interface OverlayPosition {
  x: number;
  y: number;
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
  isPro: boolean;
  licenseKey: string;
  activatedAt: number;
  defaultSpeed: number;
  hudEnabled: boolean;
  preservesPitch: boolean;
  loopVideo: boolean;
  activeTab: string;
  favoriteSpeed: number;
  domainSpeeds: Record<string, number>;
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
}

export const SETTING_BOUNDS = {
  speedStep: { min: 0.01, max: 1, fallback: 0.1 },
  seekSeconds: { min: 1, max: 600, fallback: 10 },
  overlayAutoHideMs: { min: 500, max: 10000, fallback: 2000 }
} as const;

/** Defaults for every key except installDate (set at install time). */
export function defaultState(): Omit<StoredState, 'installDate'> {
  return {
    schemaVersion: SCHEMA_VERSION,
    isPro: false,
    licenseKey: '',
    activatedAt: 0,
    defaultSpeed: 1,
    hudEnabled: true,
    preservesPitch: true,
    loopVideo: false,
    activeTab: 'speed',
    favoriteSpeed: 2,
    domainSpeeds: {},
    videoCheckpoints: {},
    speedStep: SETTING_BOUNDS.speedStep.fallback,
    seekSeconds: SETTING_BOUNDS.seekSeconds.fallback,
    rememberSpeed: true,
    applyToAll: false,
    overlayAutoHideMs: SETTING_BOUNDS.overlayAutoHideMs.fallback,
    overlayPositions: {},
    shortcuts: defaultShortcuts(),
    shortcutBlacklist: []
  };
}

export const STORAGE_KEYS = Object.keys({ installDate: 0, ...defaultState() }) as (keyof StoredState)[];
