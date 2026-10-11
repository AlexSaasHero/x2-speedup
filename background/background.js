// SpeedUp Video Pro - Background Service Worker (Manifest V3)

// Initialize default extension settings & Pro dev state
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get([
    'installDate',
    'isPro',
    'isLicensed',
    'defaultSpeed',
    'hudEnabled',
    'preservesPitch',
    'loopVideo',
    'activeTab',
    'favoriteSpeed',
    'customHotkeys',
    'domainSpeeds',
    'videoCheckpoints'
  ]);

  const updates = {};
  if (!existing.installDate) updates.installDate = Date.now();
  if (existing.isPro === undefined) updates.isPro = true;
  if (existing.isLicensed === undefined) updates.isLicensed = true;
  if (existing.defaultSpeed === undefined) updates.defaultSpeed = 1.0;
  if (existing.hudEnabled === undefined) updates.hudEnabled = true;
  if (existing.preservesPitch === undefined) updates.preservesPitch = true;
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
