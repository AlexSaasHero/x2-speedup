// Options page: all Phase 1 settings, persisted to chrome.storage.local.
import { formatSpeed, planLimits } from '../config/plans';
import { isPro } from '../shared/entitlement';
import { parseHostList } from '../shared/hosts';
import { migrate } from '../shared/migrations';
import { defaultShortcuts, type Shortcut } from '../shared/shortcuts';
import { SETTING_BOUNDS, type StoredState } from '../shared/storage';
import { mountShortcutEditor } from '../ui/shortcut-editor';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let state: StoredState;
let savedTimer = 0;

function save(update: Partial<StoredState>): void {
  state = { ...state, ...update };
  chrome.storage.local.set(update).then(() => {
    const hint = $('savedHint');
    hint.textContent = 'Saved';
    clearTimeout(savedTimer);
    savedTimer = window.setTimeout(() => (hint.textContent = ''), 1200);
  });
}

function bindNumber(id: string, read: () => number, write: (v: number) => Partial<StoredState>, bounds: { min: number; max: number }) {
  const input = $<HTMLInputElement>(id);
  input.value = String(read());
  input.addEventListener('change', () => {
    const n = parseFloat(input.value);
    if (!Number.isFinite(n)) {
      input.value = String(read());
      return;
    }
    const v = Math.min(Math.max(n, bounds.min), bounds.max);
    input.value = String(v);
    save(write(v));
    editor.render();
  });
}

function bindCheck(id: keyof StoredState & string) {
  const input = $<HTMLInputElement>(id);
  input.checked = !!state[id];
  input.addEventListener('change', () => save({ [id]: input.checked } as Partial<StoredState>));
}

let editor: ReturnType<typeof mountShortcutEditor>;

async function init() {
  const raw = await chrome.storage.local.get(null);
  state = migrate(raw).set as StoredState;
  const limits = planLimits(isPro(state));

  editor = mountShortcutEditor({
    container: $('shortcutEditor'),
    get: () => state.shortcuts,
    save: (list: Shortcut[]) => save({ shortcuts: list }),
    context: () => ({ speedStep: state.speedStep, seekSeconds: state.seekSeconds, favoriteSpeed: state.favoriteSpeed })
  });

  bindNumber('speedStep', () => state.speedStep, (v) => ({ speedStep: v }), SETTING_BOUNDS.speedStep);
  bindNumber('seekSeconds', () => state.seekSeconds, (v) => ({ seekSeconds: Math.round(v) }), SETTING_BOUNDS.seekSeconds);
  bindNumber('favoriteSpeed', () => state.favoriteSpeed, (v) => ({ favoriteSpeed: v }), { min: limits.minSpeed, max: 16 });
  bindNumber(
    'overlayAutoHideSec',
    () => state.overlayAutoHideMs / 1000,
    (v) => ({ overlayAutoHideMs: Math.round(v * 1000) }),
    { min: SETTING_BOUNDS.overlayAutoHideMs.min / 1000, max: SETTING_BOUNDS.overlayAutoHideMs.max / 1000 }
  );
  $('favoriteHint').textContent = `Toggled by the Preferred speed shortcut. Your plan allows up to ${formatSpeed(limits.maxSpeed)}.`;

  for (const id of ['rememberSpeed', 'applyToAll', 'preservesPitch', 'hudEnabled'] as const) bindCheck(id);

  const positions = $('positionsCount');
  positions.textContent = String(Object.keys(state.overlayPositions).length);
  $('resetPositions').addEventListener('click', () => {
    save({ overlayPositions: {} });
    positions.textContent = '0';
  });

  $('resetShortcuts').addEventListener('click', () => {
    editor.cancel();
    save({ shortcuts: defaultShortcuts() });
    editor.render();
  });

  const blacklist = $<HTMLTextAreaElement>('shortcutBlacklist');
  blacklist.value = state.shortcutBlacklist.join('\n');
  blacklist.addEventListener('change', () => {
    const list = parseHostList(blacklist.value);
    blacklist.value = list.join('\n');
    save({ shortcutBlacklist: list });
  });
}

init();
