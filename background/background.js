// SpeedUp Video Pro - Background Service Worker (Manifest V3 - v1.5.1.8)

const WELCOME_URL = 'https://x2-speedup.vercel.app/#welcome';

// Initialize default extension settings, telemetry & open onboarding on fresh install
chrome.runtime.onInstalled.addListener(async (details) => {
  // 1. Fresh installation onboarding: open welcome page to guide user to pin extension
  if (details && details.reason === 'install') {
    chrome.tabs.create({ url: WELCOME_URL });
  }

  // 2. Local storage initialization & telemetry client ID
  const existing = await chrome.storage.local.get([
    'installDate',
    'telemetry_client_id',
    'is_pro',
    'isPro',
    'isLicensed',
    'license_key',
    'licenseKey',
    'defaultSpeed',
    'hudEnabled',
    'preservesPitch',
    'preservePitch',
    'loopVideo',
    'activeTab',
    'favoriteSpeed',
    'customHotkeys',
    'domainSpeeds',
    'videoCheckpoints'
  ]);

  const updates = {};
  if (!existing.installDate) updates.installDate = Date.now();
  if (!existing.telemetry_client_id) {
    updates.telemetry_client_id = self.crypto.randomUUID();
  }
  if (existing.is_pro === undefined) updates.is_pro = false;
  if (existing.isPro === undefined) updates.isPro = false;
  if (existing.license_key === undefined) updates.license_key = null;
  if (existing.licenseKey === undefined) updates.licenseKey = '';
  if (existing.isLicensed === undefined) updates.isLicensed = false;
  if (existing.defaultSpeed === undefined) updates.defaultSpeed = 1.0;
  if (existing.hudEnabled === undefined) updates.hudEnabled = true;
  if (existing.preservesPitch === undefined) updates.preservesPitch = true;
  if (existing.preservePitch === undefined) updates.preservePitch = true;
  if (existing.loopVideo === undefined) updates.loopVideo = false;
  if (!existing.activeTab) updates.activeTab = 'speed';
  if (existing.favoriteSpeed === undefined) updates.favoriteSpeed = 2.0;
  if (!existing.customHotkeys) {
    updates.customHotkeys = {
      speedUp: ']',
      speedDown: '[',
      resetSpeed: 'r',
      favoriteSpeed: 'g'
    };
  }
  if (!existing.domainSpeeds) updates.domainSpeeds = {};
  if (!existing.videoCheckpoints) updates.videoCheckpoints = {};

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
});

// Listen for messages to update extension action badge icon
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'UPDATE_BADGE') {
    const speed = parseFloat(message.speed);
    if (!isNaN(speed)) {
      const badgeText = speed === 1.0 ? '' : `${speed.toFixed(1)}x`;
      const tabId = sender.tab ? sender.tab.id : undefined;

      chrome.action.setBadgeText({
        text: badgeText,
        tabId: tabId
      });

      chrome.action.setBadgeBackgroundColor({
        color: '#7c3aed',
        tabId: tabId
      });
    }
    sendResponse({ success: true });
  }
  return true;
});
