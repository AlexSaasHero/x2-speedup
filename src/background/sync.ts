// Mirrors user settings to chrome.storage.sync so they follow the browser profile to other
// devices. Last writer wins; our own writes are recognised by hash/device id (no echo loops).
import { migrate } from '../shared/migrations';
import type { StoredState } from '../shared/storage';
import {
  SYNC_KEYS,
  SYNC_META_KEY,
  chunkKeys,
  fromSyncItems,
  hashString,
  pickSynced,
  stableStringify,
  toSyncItems,
  type SyncMeta
} from '../shared/sync';

const PUSH_DEBOUNCE_MS = 2000;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let queue: Promise<void> = Promise.resolve();

interface SyncState {
  /** False until this install has either pulled existing remote settings or pushed its own. */
  initialized: boolean;
  status: 'ok' | 'quota' | 'error' | 'off';
  at: number;
}

const serial = (fn: () => Promise<void>) => (queue = queue.then(fn).catch(() => {}));

async function localState(): Promise<StoredState> {
  return migrate(await chrome.storage.local.get(null)).set as StoredState;
}

async function readSyncState(): Promise<SyncState> {
  const s = (await chrome.storage.local.get('syncState')).syncState as SyncState | undefined;
  return s ?? { initialized: false, status: 'ok', at: 0 };
}

async function writeSyncState(patch: Partial<SyncState>): Promise<void> {
  await chrome.storage.local.set({ syncState: { ...(await readSyncState()), ...patch, at: Date.now() } });
}

async function applyRemote(settings: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set(settings);
}

async function push(): Promise<void> {
  const state = await localState();
  if (!state.syncEnabled) return writeSyncState({ status: 'off' });
  const all = await chrome.storage.sync.get(null);
  const remote = fromSyncItems(all);
  const st = await readSyncState();
  // First run on this device: adopt existing settings from another device instead of
  // overwriting them with this install's defaults.
  if (!st.initialized) {
    await writeSyncState({ initialized: true });
    if (remote && remote.meta.device !== state.deviceId) {
      await applyRemote(remote.settings);
      return writeSyncState({ status: 'ok' });
    }
  }
  const payload = toSyncItems(pickSynced(state), state.deviceId);
  if (!payload) return writeSyncState({ status: 'quota' });
  const meta = payload[SYNC_META_KEY] as SyncMeta;
  if (remote?.meta.hash === meta.hash) return writeSyncState({ status: 'ok' });
  await chrome.storage.sync.set(payload);
  const old = (all[SYNC_META_KEY] as SyncMeta | undefined)?.chunks ?? 0;
  if (old > meta.chunks) await chrome.storage.sync.remove(chunkKeys(old).slice(meta.chunks));
  await writeSyncState({ status: 'ok' });
}

async function pull(): Promise<void> {
  const state = await localState();
  if (!state.syncEnabled) return;
  const remote = fromSyncItems(await chrome.storage.sync.get(null));
  if (!remote || remote.meta.device === state.deviceId) return;
  if (hashString(stableStringify(pickSynced(state))) === remote.meta.hash) return;
  await applyRemote(remote.settings);
  await writeSyncState({ initialized: true, status: 'ok' });
}

export function schedulePush(): void {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => serial(() => push().catch(() => writeSyncState({ status: 'error' }))), PUSH_DEBOUNCE_MS);
}

export function installSync(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (SYNC_KEYS.some((k) => k in changes) || 'syncEnabled' in changes)) schedulePush();
    if (area === 'sync' && SYNC_META_KEY in changes) serial(pull);
  });
}

/** Startup: pick up changes made on other devices while this browser was closed. */
export function syncOnStartup(): void {
  serial(pull);
}
