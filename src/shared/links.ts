// External URLs used by the UI (the only network destinations besides license validation).
export const LANDING_PAGE_URL = 'https://x2-speedup.vercel.app/';

/** Store review page for the current browser, or null when unknown. */
export function reviewUrl(extensionId: string, target: 'chrome' | 'firefox', userAgent: string): string | null {
  if (target === 'firefox') return 'https://addons.mozilla.org/firefox/addon/speedup-video-pro/reviews/';
  if (/\bEdg\//.test(userAgent)) return `https://microsoftedge.microsoft.com/addons/detail/${extensionId}`;
  return `https://chromewebstore.google.com/detail/${extensionId}/reviews`;
}
