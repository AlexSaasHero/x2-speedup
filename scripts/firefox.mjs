// Chrome MV3 manifest → Firefox MV3 manifest. See docs/FIREFOX.md for what differs and why.
export const GECKO_ID = 'speedup-video-pro@x2-speedup';
export const FIREFOX_MIN_VERSION = '128.0';

export function toFirefoxManifest(chrome) {
  const m = structuredClone(chrome);
  // Firefox MV3 runs background scripts as an event page, not a service worker.
  m.background = { scripts: [chrome.background.service_worker] };
  m.browser_specific_settings = {
    gecko: { id: GECKO_ID, strict_min_version: FIREFOX_MIN_VERSION }
  };
  // Chrome-only content script keys.
  m.content_scripts = chrome.content_scripts.map((cs) => {
    const { match_origin_as_fallback, ...rest } = cs;
    return rest;
  });
  // Lets the onboarding/popup ask for access to all sites (opt-in in Firefox MV3).
  m.optional_host_permissions = ['<all_urls>'];
  return m;
}
