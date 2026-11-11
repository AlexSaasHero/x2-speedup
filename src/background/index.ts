// SpeedUp Video Pro - Background Service Worker (Manifest V3)
// Stateless: everything persistent lives in chrome.storage.
import { migrate } from '../shared/migrations';
import { isFeatureUpdate } from '../shared/version';
import { LICENSE_ALARM, activate, checkIfDue, deactivate, scheduleLicenseChecks } from './license';
import { installSync, schedulePush, syncOnStartup } from './sync';

installSync();
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

const ONBOARDING_PAGE = 'onboarding/onboarding.html';

chrome.runtime.onInstalled.addListener(async (details) => {
  // Fresh install: local onboarding (shortcut demo + trial). Update: "What's new" only for
  // major/minor releases, never for patches.
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL(ONBOARDING_PAGE) });
  } else if (details.reason === 'update' && isFeatureUpdate(details.previousVersion, chrome.runtime.getManifest().version)) {
    chrome.tabs.create({ url: chrome.runtime.getURL(`${ONBOARDING_PAGE}#whats-new`), active: false });
  }

  // Normalise storage to the current schema on install and on every update.
  const raw = await chrome.storage.local.get(null);
  const { set, remove } = migrate(raw);
  await chrome.storage.local.set(set);
  if (remove.length) await chrome.storage.local.remove(remove);

  // Older popups mirrored license flags into storage.sync under legacy names.
  try {
    await chrome.storage.sync.remove(['is_pro', 'isPro', 'license_key', 'licenseKey', 'isLicensed', 'activatedAt']);
  } catch {
    // storage.sync may be unavailable (e.g. sync disabled by policy) — nothing to clean up then.
  }

  scheduleLicenseChecks();
  // Migrated licenses are re-validated right away (they were never checked by a server).
  void checkIfDue();
  // Fresh install with settings from another device: adopt them (see sync.ts).
  schedulePush();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleLicenseChecks();
  void checkIfDue();
  syncOnStartup();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === LICENSE_ALARM) void checkIfDue();
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
  // License operations are only accepted from extension pages (popup, options, onboarding).
  const fromExtensionPage = !sender.tab || sender.url?.startsWith(chrome.runtime.getURL(''));
  if (message?.action === 'LICENSE_ACTIVATE' && fromExtensionPage && typeof message.key === 'string') {
    activate(message.key).then(sendResponse, () => sendResponse({ ok: false, verdict: 'unreachable' }));
    return true;
  }
  if (message?.action === 'LICENSE_DEACTIVATE' && fromExtensionPage) {
    deactivate().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.action === 'LICENSE_REFRESH' && fromExtensionPage) {
    checkIfDue(true).then(() => sendResponse({ ok: true }));
    return true;
  }
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
