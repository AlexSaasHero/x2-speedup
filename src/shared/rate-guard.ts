// Rate guard for lecture players that keep writing their own speed (Echo360, Panopto: BUGS #23, #24).
//
// Runs in the page's own JavaScript world (manifest content script with "world": "MAIN"), only on
// the lecture-platform domains. It wraps the playbackRate / defaultPlaybackRate setters of
// HTMLMediaElement: when the extension owns an element's speed (attribute OWNED_RATE_ATTR, written by
// the content script), a write from the page is replaced by the owned speed. The player's write
// becomes a no-op: no ratechange, no tug of war with the extension, no 1x gap.
//
// The extension's own writes are not affected: the content script runs in an isolated world with its
// own HTMLMediaElement.prototype. No network, no messaging: the only channel is the DOM attribute.

/** Set by the content script on media whose speed the extension owns (value: the speed, e.g. "2.5"). */
export const OWNED_RATE_ATTR = 'data-lecturespeed-rate';
/**
 * Set once by the guard on an element the first time it blocks a different speed from the page, so the
 * content script can explain once why the player's own speed menu does nothing (lecture toast).
 */
export const BLOCKED_ATTR = 'data-lecturespeed-blocked';

const PROPS = ['playbackRate', 'defaultPlaybackRate'] as const;
const INSTALLED = Symbol.for('lecturespeed.rateGuard');

/** The owned speed of `el`, or null when the page is free to set it. */
export function ownedRate(el: Element): number | null {
  const raw = el.getAttribute(OWNED_RATE_ATTR);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Wraps the setters on `proto` (HTMLMediaElement.prototype). Idempotent. Returns false if not possible. */
export function installRateGuard(proto: object): boolean {
  const p = proto as Record<symbol, unknown>;
  if (p[INSTALLED]) return true;
  for (const prop of PROPS) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (!desc?.get || !desc.set || !desc.configurable) return false;
  }
  for (const prop of PROPS) {
    const { get, set, enumerable } = Object.getOwnPropertyDescriptor(proto, prop)!;
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable,
      get() {
        return get!.call(this);
      },
      set(value: number) {
        const owned = this instanceof Element ? ownedRate(this) : null;
        if (owned === null) return set!.call(this, value);
        // The extension owns this element: keep its speed. Writing the same value fires nothing.
        if (value !== owned && this instanceof Element && !this.hasAttribute(BLOCKED_ATTR)) this.setAttribute(BLOCKED_ATTR, '');
        if (get!.call(this) !== owned) set!.call(this, owned);
      }
    });
  }
  Object.defineProperty(proto, INSTALLED, { value: true });
  return true;
}
