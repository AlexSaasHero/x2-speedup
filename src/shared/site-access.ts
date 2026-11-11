// Firefox MV3: access to websites (and therefore the content script) is opt-in, granted by the
// user. Chrome/Edge grant it at install, so these helpers are no-ops there.
export const ALL_SITES = { origins: ['<all_urls>'] };

export function needsSiteAccessPrompt(): boolean {
  return __TARGET__ === 'firefox';
}

export async function hasSiteAccess(): Promise<boolean> {
  if (!needsSiteAccessPrompt()) return true;
  try {
    return await chrome.permissions.contains(ALL_SITES);
  } catch {
    return true;
  }
}

/** Must be called from a user gesture (click). */
export async function requestSiteAccess(): Promise<boolean> {
  try {
    return await chrome.permissions.request(ALL_SITES);
  } catch {
    return false;
  }
}
