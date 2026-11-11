// Keyboard shortcut model: parsing, matching, formatting and legacy migration.
// Pure (no DOM access) so it can be unit-tested and shared by content, popup and options.

export type ShortcutAction =
  | 'slower'
  | 'faster'
  | 'reset'
  | 'preferred'
  | 'rewind'
  | 'advance'
  | 'toggleOverlay'
  /** Pro: hold the key for a temporary speed, release to go back. */
  | 'hold'
  /** Pro: 1st press sets A, 2nd sets B and loops, 3rd clears. */
  | 'abRepeat';

/** Actions that need a Pro feature (see config/plans.ts). */
export const PRO_ACTIONS: Partial<Record<ShortcutAction, 'holdToSpeed' | 'abRepeat'>> = {
  hold: 'holdToSpeed',
  abRepeat: 'abRepeat'
};

export const SHORTCUT_ACTIONS: readonly ShortcutAction[] = [
  'slower',
  'faster',
  'reset',
  'preferred',
  'rewind',
  'advance',
  'toggleOverlay',
  'hold',
  'abRepeat'
];

export interface Shortcut {
  action: ShortcutAction;
  /** Normalised KeyboardEvent.key (single characters lower-cased, ' ' → 'Space'). */
  key: string;
  /** KeyboardEvent.code at capture time; used when the layout or Alt changes `key`. */
  code: string;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}

/** The subset of KeyboardEvent we rely on (keeps the module testable without a DOM). */
export interface KeyLike {
  key: string;
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

type Mods = Partial<Pick<Shortcut, 'shift' | 'alt' | 'ctrl' | 'meta'>>;

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'CapsLock', 'Fn', 'FnLock']);

export function normalizeKey(key: string): string {
  if (key === ' ' || key === 'Spacebar') return 'Space';
  return key.length === 1 ? key.toLowerCase() : key;
}

const CODE_BY_CHAR: Record<string, string> = {
  '[': 'BracketLeft',
  ']': 'BracketRight',
  ';': 'Semicolon',
  "'": 'Quote',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  '\\': 'Backslash',
  '-': 'Minus',
  '=': 'Equal',
  '`': 'Backquote'
};

/** Best-effort physical key for a US layout; '' when unknown. */
export function codeForKey(key: string): string {
  const k = normalizeKey(key);
  if (/^[a-z]$/.test(k)) return `Key${k.toUpperCase()}`;
  if (/^[0-9]$/.test(k)) return `Digit${k}`;
  if (k === 'Space') return 'Space';
  if (CODE_BY_CHAR[k]) return CODE_BY_CHAR[k];
  if (/^(Arrow(Up|Down|Left|Right)|F\d{1,2}|Home|End|PageUp|PageDown|Enter|Tab|Backspace|Delete|Insert)$/.test(k)) return k;
  return '';
}

export function binding(action: ShortcutAction, key: string, mods: Mods = {}): Shortcut {
  return {
    action,
    key: normalizeKey(key),
    code: codeForKey(key),
    shift: !!mods.shift,
    alt: !!mods.alt,
    ctrl: !!mods.ctrl,
    meta: !!mods.meta
  };
}

/** Video Speed Controller–compatible defaults (+ G for the preferred speed). */
export function defaultShortcuts(): Shortcut[] {
  return [
    binding('slower', 's'),
    binding('faster', 'd'),
    binding('reset', 'r'),
    binding('preferred', 'g'),
    binding('rewind', 'z'),
    binding('advance', 'x'),
    binding('toggleOverlay', 'v'),
    binding('hold', 'f', { shift: true }),
    binding('abRepeat', 'a', { shift: true })
  ];
}

/**
 * Give actions introduced after `existing` was saved their default binding,
 * unless that key combination is already taken.
 */
export function addDefaultsForNewActions(existing: readonly Shortcut[], newActions: readonly ShortcutAction[]): Shortcut[] {
  const out = [...existing];
  for (const d of defaultShortcuts()) {
    if (!newActions.includes(d.action)) continue;
    if (out.some((s) => s.action === d.action || sameCombo(s, d))) continue;
    out.push(d);
  }
  return out;
}

export function isModifierOnly(e: Pick<KeyLike, 'key'>): boolean {
  return MODIFIER_KEYS.has(e.key);
}

export function shortcutFromEvent(action: ShortcutAction, e: KeyLike): Shortcut | null {
  if (isModifierOnly(e)) return null;
  const usable = !!e.key && e.key !== 'Dead' && e.key !== 'Unidentified';
  if (!usable && !e.code) return null;
  return {
    action,
    key: usable ? normalizeKey(e.key) : e.code,
    code: e.code || '',
    shift: e.shiftKey,
    alt: e.altKey,
    ctrl: e.ctrlKey,
    meta: e.metaKey
  };
}

const isPrintableAscii = (key: string) => key.length === 1 && key >= ' ' && key <= '~';

export function matches(s: Shortcut, e: KeyLike): boolean {
  if (s.ctrl !== e.ctrlKey || s.meta !== e.metaKey || s.alt !== e.altKey || s.shift !== e.shiftKey) return false;
  if (normalizeKey(e.key) === s.key) return true;
  // Option/Alt on macOS and non-Latin layouts change `key` (e.g. Alt+S → "ß", "ы"): fall back to the physical key.
  return !!s.code && s.code === e.code && (e.altKey || !isPrintableAscii(e.key));
}

export function findShortcut(list: readonly Shortcut[], e: KeyLike): Shortcut | undefined {
  return list.find((s) => matches(s, e));
}

export function sameCombo(a: Shortcut, b: Shortcut): boolean {
  return a.key === b.key && a.shift === b.shift && a.alt === b.alt && a.ctrl === b.ctrl && a.meta === b.meta;
}

const KEY_LABELS: Record<string, string> = {
  Space: 'Space',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→'
};

export function formatShortcut(s: Shortcut, mac = false): string {
  const parts: string[] = [];
  if (s.ctrl) parts.push(mac ? '⌃' : 'Ctrl');
  if (s.alt) parts.push(mac ? '⌥' : 'Alt');
  if (s.shift) parts.push(mac ? '⇧' : 'Shift');
  if (s.meta) parts.push(mac ? '⌘' : 'Meta');
  let label = KEY_LABELS[s.key] ?? (s.key.length === 1 ? s.key.toUpperCase() : s.key);
  // Alt-modified letters are stored by physical key on macOS; show the letter, not "ß".
  if (s.alt && /^Key[A-Z]$/.test(s.code)) label = s.code.slice(3);
  parts.push(label);
  return parts.join(mac ? '' : '+');
}

export function validateShortcut(raw: unknown): Shortcut | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.action !== 'string' || !SHORTCUT_ACTIONS.includes(r.action as ShortcutAction)) return null;
  if (typeof r.key !== 'string' || !r.key) return null;
  return {
    action: r.action as ShortcutAction,
    key: normalizeKey(r.key),
    code: typeof r.code === 'string' ? r.code : codeForKey(r.key),
    shift: r.shift === true,
    alt: r.alt === true,
    ctrl: r.ctrl === true,
    meta: r.meta === true
  };
}

/**
 * Insert or replace a binding, removing the same key combination from any other action
 * (a combo can only trigger one action).
 */
export function upsertShortcut(list: readonly Shortcut[], next: Shortcut, replacing?: Shortcut): Shortcut[] {
  const base = replacing && list.includes(replacing) ? list.map((s) => (s === replacing ? next : s)) : [...list, next];
  return base.filter((s) => s === next || !sameCombo(s, next));
}

// ---- Legacy (≤ v1.5.1.8) customHotkeys migration -------------------------------------------

const LEGACY_DEFAULTS = { speedUp: ']', speedDown: '[', resetSpeed: 'r', favoriteSpeed: 'g' } as const;
const LEGACY_TO_ACTION: Record<keyof typeof LEGACY_DEFAULTS, ShortcutAction> = {
  speedUp: 'faster',
  speedDown: 'slower',
  resetSpeed: 'reset',
  favoriteSpeed: 'preferred'
};

/**
 * Old versions bound `]` `[` `r` `g` (customisable) and additionally hard-coded `d`/`s`.
 * Upgraded users keep every key they had (default or custom) on top of the new VSC defaults;
 * a custom key wins over a new default that used the same key for a different action.
 */
export function migrateLegacyHotkeys(custom: Record<string, unknown> | undefined): Shortcut[] {
  let list = defaultShortcuts();
  if (!custom) return list;
  for (const legacy of Object.keys(LEGACY_DEFAULTS) as (keyof typeof LEGACY_DEFAULTS)[]) {
    const raw = custom[legacy];
    const key = typeof raw === 'string' && raw ? normalizeKey(raw) : LEGACY_DEFAULTS[legacy];
    const next = binding(LEGACY_TO_ACTION[legacy], key);
    if (list.some((s) => s.action === next.action && sameCombo(s, next))) continue;
    list = list.filter((s) => !sameCombo(s, next));
    list.push(next);
  }
  return list;
}
