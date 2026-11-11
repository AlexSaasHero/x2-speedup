import { describe, expect, it } from 'vitest';
import {
  binding,
  codeForKey,
  defaultShortcuts,
  findShortcut,
  formatShortcut,
  matches,
  normalizeKey,
  shortcutFromEvent,
  upsertShortcut,
  validateShortcut,
  type KeyLike
} from '../../src/shared/shortcuts';

const key = (k: string, code = codeForKey(k), mods: Partial<KeyLike> = {}): KeyLike => ({
  key: k,
  code,
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...mods
});

describe('shortcuts', () => {
  it('defaults are VSC compatible', () => {
    const map = Object.fromEntries(defaultShortcuts().map((s) => [s.action, s.key]));
    expect(map).toEqual({ slower: 's', faster: 'd', reset: 'r', preferred: 'g', rewind: 'z', advance: 'x', toggleOverlay: 'v', hold: 'f', abRepeat: 'a' });
    expect(defaultShortcuts().find((s) => s.action === 'hold')?.shift).toBe(true);
  });

  it('normalises keys', () => {
    expect(normalizeKey('S')).toBe('s');
    expect(normalizeKey(' ')).toBe('Space');
    expect(normalizeKey('ArrowUp')).toBe('ArrowUp');
    expect(codeForKey(']')).toBe('BracketRight');
    expect(codeForKey('q')).toBe('KeyQ');
    expect(codeForKey('ä')).toBe('');
  });

  it('matches exact modifiers only', () => {
    const d = binding('faster', 'd');
    expect(matches(d, key('d'))).toBe(true);
    expect(matches(d, key('D', 'KeyD', { shiftKey: true }))).toBe(false);
    expect(matches(d, key('d', 'KeyD', { ctrlKey: true }))).toBe(false);
    const shiftD = binding('faster', 'd', { shift: true });
    expect(matches(shiftD, key('D', 'KeyD', { shiftKey: true }))).toBe(true);
  });

  it('falls back to the physical key for Alt on macOS and non-Latin layouts', () => {
    const altS = binding('slower', 's', { alt: true });
    expect(matches(altS, key('ß', 'KeyS', { altKey: true }))).toBe(true);
    expect(matches(binding('slower', 's'), key('ы', 'KeyS'))).toBe(true);
    // A Latin layout where the physical KeyS prints another letter must use the letter.
    expect(matches(binding('slower', 's'), key('o', 'KeyS'))).toBe(false);
  });

  it('captures a shortcut from an event, ignoring bare modifiers', () => {
    expect(shortcutFromEvent('faster', key('Shift', 'ShiftLeft', { shiftKey: true }))).toBeNull();
    expect(shortcutFromEvent('faster', key('E', 'KeyE', { shiftKey: true, ctrlKey: true }))).toEqual({
      action: 'faster',
      key: 'e',
      code: 'KeyE',
      shift: true,
      alt: false,
      ctrl: true,
      meta: false
    });
  });

  it('finds the first matching shortcut', () => {
    expect(findShortcut(defaultShortcuts(), key('x'))?.action).toBe('advance');
    expect(findShortcut(defaultShortcuts(), key('q'))).toBeUndefined();
  });

  it('upsert replaces in place and removes the combo from other actions', () => {
    const list = defaultShortcuts();
    const reset = list.find((s) => s.action === 'reset')!;
    const out = upsertShortcut(list, binding('reset', 'd'), reset);
    expect(out.find((s) => s.key === 'd')?.action).toBe('reset');
    expect(out.some((s) => s.action === 'faster')).toBe(false);
    expect(out.indexOf(out.find((s) => s.action === 'reset')!)).toBe(list.indexOf(reset) - 1);
    const added = upsertShortcut(list, binding('faster', 'ArrowRight'));
    expect(added).toHaveLength(list.length + 1);
  });

  it('formats for display', () => {
    expect(formatShortcut(binding('faster', 'd'))).toBe('D');
    expect(formatShortcut(binding('faster', 'd', { ctrl: true, shift: true }))).toBe('Ctrl+Shift+D');
    expect(formatShortcut(binding('faster', 'd', { meta: true }), true)).toBe('⌘D');
    expect(formatShortcut({ ...binding('slower', 's', { alt: true }), key: 'ß' }, true)).toBe('⌥S');
    expect(formatShortcut(binding('rewind', 'ArrowLeft'))).toBe('←');
  });

  it('validates stored shortcuts', () => {
    expect(validateShortcut(binding('rewind', 'z'))).toEqual(binding('rewind', 'z'));
    expect(validateShortcut({ action: 'rewind', key: 'Z' })).toEqual(binding('rewind', 'z'));
    expect(validateShortcut({ action: 'explode', key: 'z' })).toBeNull();
    expect(validateShortcut(null)).toBeNull();
  });
});
