// SpeedUp Video Pro - Background Service Worker (Manifest V3)
// Stateless: everything persistent lives in chrome.storage.
import { migrate } from '../shared/migrations';
import {
  STATS_BUFFER_KEY,
  STATS_KEY,
  STATS_WRITE_INTERVAL_MS,
  applyBuffer,
  bufferAdd,
  emptyBuffer,
  validateStats,
  type DayStats,
  type StatsBuffer
} from '../shared/stats';

const WELCOME_URL = 'https://x2-speedup.vercel.app/#welcome';

chrome.runtime.onInstalled.addListener(async (details) => {
  // Fresh install: open welcome page (replaced by local onboarding in Phase 3).
  if (details.reason === 'install') {
    chrome.tabs.create({ url: WELCOME_URL });
  }

  // Normalise storage to the current schema on install and on every update.
  const raw = await chrome.storage.local.get(null);
  const { set, remove } = migrate(raw);
  await chrome.storage.local.set(set);
  if (remove.length) await chrome.storage.local.remove(remove);

  // Older popups mirrored license flags into storage.sync under legacy names.
  try {
    await chrome.storage.sync.remove(['is_pro', 'license_key', 'isLicensed']);
  } catch {
    // storage.sync may be unavailable (e.g. sync disabled by policy) — nothing to clean up then.
  }
});

// Time-saved aggregation. Content scripts send small deltas every few seconds while playing.
// Deltas are buffered in storage.session (survives worker restarts, no in-memory state) and the
// daily aggregates in storage.local are written at most once every 30 s. Writes are serialised
// through a promise chain so concurrent tabs never lose each other's updates.
let statsQueue: Promise<void> = Promise.resolve();

function addTimeSaved(day: string, delta: DayStats): Promise<void> {
  statsQueue = statsQueue
    .then(async () => {
      const buf = bufferAdd((await chrome.storage.session.get(STATS_BUFFER_KEY))[STATS_BUFFER_KEY] as StatsBuffer, day, delta);
      if (Date.now() - buf.lastWrite < STATS_WRITE_INTERVAL_MS) {
        await chrome.storage.session.set({ [STATS_BUFFER_KEY]: buf });
        return;
      }
      const current = validateStats((await chrome.storage.local.get(STATS_KEY))[STATS_KEY]);
      await chrome.storage.local.set({ [STATS_KEY]: applyBuffer(current, buf) });
      await chrome.storage.session.set({ [STATS_BUFFER_KEY]: { ...emptyBuffer(), lastWrite: Date.now() } });
    })
    .catch(() => {});
  return statsQueue;
}

const isDelta = (d: unknown): d is DayStats =>
  !!d && typeof d === 'object' && Number.isFinite((d as DayStats).saved) && Number.isFinite((d as DayStats).watched);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'UPDATE_BADGE') {
    const speed = parseFloat(message.speed);
    if (!isNaN(speed)) {
      const tabId = sender.tab ? sender.tab.id : undefined;
      chrome.action.setBadgeText({ text: speed === 1 ? '' : `${speed.toFixed(1)}x`, tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#7c3aed', tabId });
    }
    sendResponse({ success: true });
    return false;
  }
  if (message?.action === 'STATS_ADD' && typeof message.day === 'string' && isDelta(message.delta)) {
    // Sanity bound: one delta never covers more than a few minutes of real time.
    if (message.delta.watched > 0 && message.delta.watched < 600) {
      addTimeSaved(message.day, message.delta).then(() => sendResponse({ success: true }));
      return true;
    }
    sendResponse({ success: false });
  }
  return false;
});
