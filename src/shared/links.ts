// External URLs used by the UI (the only network destinations besides license validation).
export const LANDING_PAGE_URL = 'https://lecturespeed.vercel.app/';

/** Chrome Web Store id of the published extension (unpacked dev builds have a different runtime id). */
export const CWS_EXTENSION_ID = 'bhbogbkkghkempphmaffejebjiimbimh';
/** Store reviews page. Edge users install from the Chrome Web Store too (no Edge Add-ons listing). */
export const CWS_REVIEWS_URL = `https://chromewebstore.google.com/detail/${CWS_EXTENSION_ID}/reviews`;

/**
 * Firefox: AMO accepts the Gecko id in place of the slug, so this works whatever slug is chosen.
 * The add-on is not on AMO yet (checked 2026-11-19): until it is, AMO_LISTED stays false and the
 * popup shows no review prompt on Firefox. See docs/FIREFOX.md.
 */
export const AMO_LISTED = false;
export const AMO_REVIEWS_URL = 'https://addons.mozilla.org/firefox/addon/speedup-video-pro@x2-speedup/reviews/';

/** Store review page for the current build, or null when there is none to send the user to. */
export function reviewUrl(target: 'chrome' | 'firefox', amoListed: boolean = AMO_LISTED): string | null {
  if (target === 'firefox') return amoListed ? AMO_REVIEWS_URL : null;
  return CWS_REVIEWS_URL;
}
