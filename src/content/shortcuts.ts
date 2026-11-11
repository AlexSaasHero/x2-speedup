// Keyboard shortcuts for the content script (capture phase, before page handlers).
import { isHostListed } from '../shared/hosts';
import { findShortcut, normalizeKey, type Shortcut, type ShortcutAction } from '../shared/shortcuts';
import { isEditableEvent } from './editable';
import type { ContentSettings } from './settings';

export interface ShortcutDeps {
  settings(): ContentSettings;
  host: string;
  hasMedia(): boolean;
  run(action: ShortcutAction): void;
  /** Hold-to-speed: key went down (true) / up or focus lost (false). */
  hold(active: boolean): void;
}

export function installShortcuts(deps: ShortcutDeps): void {
  let held: Shortcut | null = null;
  const release = () => {
    if (!held) return;
    held = null;
    deps.hold(false);
  };

  window.addEventListener(
    'keydown',
    (e) => {
      if (e.isComposing) return;
      const s = deps.settings();
      if (!s.shortcuts.length || isHostListed(deps.host, s.shortcutBlacklist)) return;
      const shortcut = findShortcut(s.shortcuts, e);
      if (!shortcut || isEditableEvent(e) || !deps.hasMedia()) return;
      // Only swallow keys we actually handle; everything else reaches the site untouched.
      e.preventDefault();
      e.stopImmediatePropagation();
      if (shortcut.action === 'hold') {
        if (!held) {
          held = shortcut;
          deps.hold(true);
        }
        return;
      }
      deps.run(shortcut.action);
    },
    true
  );

  window.addEventListener(
    'keyup',
    (e) => {
      if (!held) return;
      // Modifiers may be released first; only the main key ends the hold.
      if (e.code === held.code || normalizeKey(e.key) === held.key) {
        e.preventDefault();
        e.stopImmediatePropagation();
        release();
      }
    },
    true
  );
  // Never leave the speed stuck if the key-up happens while we are not focused.
  window.addEventListener('blur', release);
  window.addEventListener('pagehide', release);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && release());
}
