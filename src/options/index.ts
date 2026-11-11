// Options page: all Phase 1 settings, persisted to chrome.storage.local.
import { formatSpeed, planLimits } from '../config/plans';
import { isPro } from '../shared/entitlement';
import { parseHostList } from '../shared/hosts';
import { upsertRule, type Rule } from '../shared/rules';
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

function bindCheck(id: 'rememberSpeed' | 'applyToAll' | 'preservesPitch' | 'hudEnabled' | 'youtubeAds') {
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
    context: () => ({ speedStep: state.speedStep, seekSeconds: state.seekSeconds, favoriteSpeed: state.favoriteSpeed, holdSpeed: state.holdSpeed })
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

  initPro(isPro(state));

  const blacklist = $<HTMLTextAreaElement>('shortcutBlacklist');
  blacklist.value = state.shortcutBlacklist.join('\n');
  blacklist.addEventListener('change', () => {
    const list = parseHostList(blacklist.value);
    blacklist.value = list.join('\n');
    save({ shortcutBlacklist: list });
  });
}

function initPro(pro: boolean) {
  const badge = $('proBadge');
  badge.textContent = pro ? 'Pro active' : 'Pro';
  badge.classList.toggle('on', pro);
  $('proNote').textContent = pro
    ? 'All features below are active.'
    : 'You can configure these now; they turn on when Pro is active (7-day free trial from the popup).';

  const ss = () => state.skipSilence;
  const ssEnabled = $<HTMLInputElement>('ssEnabled');
  ssEnabled.checked = ss().enabled;
  ssEnabled.addEventListener('change', () => save({ skipSilence: { ...ss(), enabled: ssEnabled.checked } }));
  bindNumber('ssThreshold', () => ss().thresholdDb, (v) => ({ skipSilence: { ...ss(), thresholdDb: v } }), SETTING_BOUNDS.thresholdDb);
  bindNumber('ssSpeed', () => ss().silenceSpeed, (v) => ({ skipSilence: { ...ss(), silenceSpeed: v } }), SETTING_BOUNDS.silenceSpeed);
  bindNumber('ssMinSilence', () => ss().minSilenceMs, (v) => ({ skipSilence: { ...ss(), minSilenceMs: Math.round(v) } }), SETTING_BOUNDS.minSilenceMs);
  bindNumber('ssMinSpeech', () => ss().minSpeechMs, (v) => ({ skipSilence: { ...ss(), minSpeechMs: Math.round(v) } }), SETTING_BOUNDS.minSpeechMs);
  bindNumber('holdSpeed', () => state.holdSpeed, (v) => ({ holdSpeed: v }), SETTING_BOUNDS.holdSpeed);
  bindCheck('youtubeAds');

  renderRules();
  $('addRule').addEventListener('click', () => {
    const type = $<HTMLSelectElement>('newRuleType').value as Rule['type'];
    const pattern = $<HTMLInputElement>('newRulePattern').value.trim();
    const speed = parseFloat($<HTMLInputElement>('newRuleSpeed').value);
    if (!pattern || !Number.isFinite(speed) || speed <= 0) return;
    save({ rules: upsertRule(state.rules, { type, pattern, speed: Math.min(Math.max(speed, 0.1), 16) }) });
    $<HTMLInputElement>('newRulePattern').value = '';
    renderRules();
  });
}

const TYPE_LABEL: Record<Rule['type'], string> = { channel: 'Channel', url: 'URL', domain: 'Site' };

function renderRules() {
  const body = $('rulesBody');
  body.textContent = '';
  if (!state.rules.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'empty';
    td.textContent = 'No rules yet. Create one from the popup (Smart tab) or below.';
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const r of state.rules) {
    const tr = document.createElement('tr');
    const type = document.createElement('td');
    type.textContent = TYPE_LABEL[r.type];
    const pattern = document.createElement('td');
    pattern.textContent = r.label && r.label !== r.pattern ? `${r.pattern} (${r.label})` : r.pattern;
    const speedTd = document.createElement('td');
    const speed = document.createElement('input');
    speed.type = 'number';
    speed.min = '0.1';
    speed.max = '16';
    speed.step = '0.1';
    speed.value = String(r.speed);
    speed.addEventListener('change', () => {
      const v = parseFloat(speed.value);
      if (!Number.isFinite(v) || v <= 0) return void (speed.value = String(r.speed));
      save({ rules: state.rules.map((x) => (x.id === r.id ? { ...x, speed: Math.min(Math.max(v, 0.1), 16) } : x)) });
    });
    speedTd.append(speed);
    const del = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = 'Delete';
    btn.addEventListener('click', () => {
      save({ rules: state.rules.filter((x) => x.id !== r.id) });
      renderRules();
    });
    del.append(btn);
    tr.append(type, pattern, speedTd, del);
    body.append(tr);
  }
}

init();
