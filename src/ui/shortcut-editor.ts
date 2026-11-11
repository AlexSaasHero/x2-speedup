// Shortcut list editor shared by the popup and the options page.
import {
  SHORTCUT_ACTIONS,
  formatShortcut,
  isModifierOnly,
  shortcutFromEvent,
  upsertShortcut,
  type Shortcut,
  type ShortcutAction
} from '../shared/shortcuts';

export const ACTION_LABELS: Record<ShortcutAction, { name: string; desc: (ctx: EditorContext) => string }> = {
  slower: { name: 'Slower', desc: (c) => `−${c.speedStep}x` },
  faster: { name: 'Faster', desc: (c) => `+${c.speedStep}x` },
  reset: { name: 'Reset', desc: () => '1.0x, press again to go back' },
  preferred: { name: 'Preferred speed', desc: (c) => `Toggle ${c.favoriteSpeed}x` },
  rewind: { name: 'Rewind', desc: (c) => `−${c.seekSeconds}s` },
  advance: { name: 'Advance', desc: (c) => `+${c.seekSeconds}s` },
  toggleOverlay: { name: 'Show/hide overlay', desc: () => 'On-video speed badge' }
};

export interface EditorContext {
  speedStep: number;
  seekSeconds: number;
  favoriteSpeed: number;
}

export interface ShortcutEditorOptions {
  container: HTMLElement;
  get(): Shortcut[];
  save(list: Shortcut[]): void;
  context(): EditorContext;
}

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);

export function mountShortcutEditor(opts: ShortcutEditorOptions): { render(): void; cancel(): void } {
  let listening: { action: ShortcutAction; replacing?: Shortcut; button: HTMLButtonElement } | null = null;

  const cancel = () => {
    listening = null;
    render();
  };

  window.addEventListener(
    'keydown',
    (e) => {
      if (!listening) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') return cancel();
      if (isModifierOnly(e)) return;
      const next = shortcutFromEvent(listening.action, e);
      if (!next) return;
      opts.save(upsertShortcut(opts.get(), next, listening.replacing));
      listening = null;
      render();
    },
    true
  );

  function chip(label: string, title: string, onClick: (btn: HTMLButtonElement) => void, extraClass = ''): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hotkey-capture-btn ${extraClass}`.trim();
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(b);
    });
    return b;
  }

  function startListening(action: ShortcutAction, button: HTMLButtonElement, replacing?: Shortcut) {
    if (listening?.button === button) return cancel();
    render();
    listening = { action, replacing, button };
    // render() rebuilt the DOM: find the equivalent button again
    const fresh = opts.container.querySelector<HTMLButtonElement>(
      replacing ? `[data-binding="${opts.get().indexOf(replacing)}"]` : `[data-add="${action}"]`
    );
    const target = fresh ?? button;
    listening.button = target;
    target.classList.add('listening');
    target.textContent = 'Press keys…';
  }

  function render() {
    const list = opts.get();
    const ctx = opts.context();
    opts.container.textContent = '';
    for (const action of SHORTCUT_ACTIONS) {
      const row = document.createElement('div');
      row.className = 'hotkey-remap-row';
      row.dataset.action = action;

      const meta = document.createElement('div');
      meta.className = 'hotkey-meta';
      const name = document.createElement('span');
      name.className = 'hotkey-name';
      name.textContent = ACTION_LABELS[action].name;
      const desc = document.createElement('span');
      desc.className = 'hotkey-desc';
      desc.textContent = ACTION_LABELS[action].desc(ctx);
      meta.append(name, desc);

      const chips = document.createElement('div');
      chips.className = 'hk-chips';
      list.forEach((s, i) => {
        if (s.action !== action) return;
        const wrap = document.createElement('span');
        wrap.className = 'hk-chip';
        const b = chip(formatShortcut(s, IS_MAC), 'Click to change', (btn) => startListening(action, btn, s));
        b.dataset.binding = String(i);
        const rm = chip('×', 'Remove', () => {
          opts.save(opts.get().filter((x) => x !== s));
          render();
        }, 'hk-remove');
        wrap.append(b, rm);
        chips.append(wrap);
      });
      const add = chip('+', 'Add a key', (btn) => startListening(action, btn), 'hk-add');
      add.dataset.add = action;
      chips.append(add);

      row.append(meta, chips);
      opts.container.append(row);
    }
  }

  render();
  return { render, cancel };
}
