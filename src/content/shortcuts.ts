// Keyboard shortcuts for the content script (capture phase, before page handlers).
import { isHostListed } from '../shared/hosts';
import { findShortcut, type ShortcutAction } from '../shared/shortcuts';
import { isEditableEvent } from './editable';
import type { ContentSettings } from './settings';

export interface ShortcutDeps {
  settings(): ContentSettings;
  host: string;
  hasMedia(): boolean;
  run(action: ShortcutAction): void;
}

export function installShortcuts(deps: ShortcutDeps): void {
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
      deps.run(shortcut.action);
    },
    true
  );
}
