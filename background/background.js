// SpeedUp Video - Background Service Worker (Manifest V3)

// Initialize default extension settings on installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      defaultSpeed: 1.0,
      hudEnabled: true,
      preservesPitch: true,
      loopVideo: false
    });
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
