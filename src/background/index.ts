// SpeedUp Video Pro - Background Service Worker (Manifest V3)
// Stateless: everything persistent lives in chrome.storage.
import { migrate } from '../shared/migrations';

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

// Per-tab toolbar badge with the current speed.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'UPDATE_BADGE') {
    const speed = parseFloat(message.speed);
    if (!isNaN(speed)) {
      const tabId = sender.tab ? sender.tab.id : undefined;
      chrome.action.setBadgeText({ text: speed === 1 ? '' : `${speed.toFixed(1)}x`, tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#7c3aed', tabId });
    }
    sendResponse({ success: true });
  }
  return false;
});
