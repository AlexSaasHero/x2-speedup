// Storage schema (chrome.storage.local). Bump SCHEMA_VERSION and add a step in
// src/shared/migrations.ts whenever a key is renamed, removed or changes shape.

export const SCHEMA_VERSION = 1;

export interface HotkeyMap {
  speedUp: string;
  speedDown: string;
  resetSpeed: string;
  favoriteSpeed: string;
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
  customHotkeys: HotkeyMap;
  domainSpeeds: Record<string, number>;
  videoCheckpoints: Record<string, Checkpoint[]>;
}

export const DEFAULT_HOTKEYS: Readonly<HotkeyMap> = Object.freeze({
  speedUp: ']',
  speedDown: '[',
  resetSpeed: 'r',
  favoriteSpeed: 'g'
});

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
    customHotkeys: { ...DEFAULT_HOTKEYS },
    domainSpeeds: {},
    videoCheckpoints: {}
  };
}

export const STORAGE_KEYS = Object.keys({ installDate: 0, ...defaultState() }) as (keyof StoredState)[];
