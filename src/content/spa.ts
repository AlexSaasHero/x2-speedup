// Single-page-app navigation hooks (no polling, no History API patching).
export function onSpaNavigation(cb: () => void): void {
  let pending = 0;
  const fire = () => {
    clearTimeout(pending);
    pending = window.setTimeout(cb, 50);
  };
  window.addEventListener('yt-navigate-finish', fire);
  window.addEventListener('popstate', fire);
  window.addEventListener('pageshow', (e) => e.persisted && fire());
  const nav = (window as unknown as { navigation?: EventTarget }).navigation;
  nav?.addEventListener('navigatesuccess', fire);
}
