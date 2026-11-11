// On-video speed overlay.
// - Closed Shadow DOM: page CSS cannot restyle it and our CSS cannot leak into the page.
// - The host is `position: fixed`, zero-size and `pointer-events: none`; only the pill itself
//   receives pointer events, so the player underneath stays fully clickable.
// - Mounted on <html>, or inside document.fullscreenElement while a player is fullscreen.
// - Never changes the page's own elements (the old HUD rewrote the player's `position`).
import type { OverlayPosition } from '../shared/storage';

export interface OverlayDeps {
  enabled(): boolean;
  autoHideMs(): number;
  speedText(anchor: HTMLVideoElement | null): string;
  position(): OverlayPosition | null;
  savePosition(p: OverlayPosition): void;
  step(direction: 1 | -1): void;
}

const DEFAULT_OFFSET_PX = 12;
const FLASH_MS = 1000;

const CSS = `
:host { all: initial; }
.pill {
  position: fixed; display: flex; align-items: center; gap: 4px;
  padding: 3px 6px; border-radius: 999px;
  background: rgba(11, 15, 25, 0.82); color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  font: 700 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  pointer-events: auto; user-select: none; touch-action: none; cursor: grab;
  opacity: 0; visibility: hidden; transition: opacity .2s ease, visibility 0s linear .2s;
}
.pill.visible { opacity: 1; visibility: visible; transition: opacity .15s ease; }
.pill.dragging { cursor: grabbing; }
.label { min-width: 42px; text-align: center; padding: 0 2px; }
button {
  all: unset; box-sizing: border-box; width: 20px; height: 20px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.12); color: inherit; cursor: pointer; font-size: 13px;
}
button:hover { background: rgba(255, 255, 255, 0.28); }
`;

export class Overlay {
  private host: HTMLElement | null = null;
  private pill!: HTMLDivElement;
  private label!: HTMLSpanElement;
  private anchor: HTMLVideoElement | null = null;
  private hideTimer = 0;
  private flashUntil = 0;
  private flashText = '';
  private sessionHidden = false;
  private visible = false;
  private drag: { dx: number; dy: number; moved: boolean } | null = null;
  private readonly reposition = () => this.place();

  constructor(private readonly deps: OverlayDeps) {
    const remount = () => this.visible && this.mount();
    document.addEventListener('fullscreenchange', remount);
    document.addEventListener('webkitfullscreenchange', remount);
  }

  /** Show over `anchor` (or the viewport corner when null), optionally with a transient label. */
  show(anchor: HTMLVideoElement | null, flash?: string): void {
    if (!this.deps.enabled() || this.sessionHidden) return;
    if (anchor) this.anchor = anchor;
    if (this.anchor && !this.anchor.isConnected) this.anchor = null;
    if (flash) {
      this.flashText = flash;
      this.flashUntil = performance.now() + FLASH_MS;
    }
    this.ensure();
    this.mount();
    this.render();
    this.place();
    if (!this.visible) {
      this.visible = true;
      this.pill.classList.add('visible');
      window.addEventListener('scroll', this.reposition, { capture: true, passive: true });
      window.addEventListener('resize', this.reposition, { passive: true });
    }
    this.scheduleHide();
  }

  /** Refresh the label if visible (e.g. after a ratechange). */
  update(): void {
    if (this.visible) this.render();
  }

  hide(): void {
    clearTimeout(this.hideTimer);
    if (!this.visible) return;
    this.visible = false;
    this.pill.classList.remove('visible');
    window.removeEventListener('scroll', this.reposition, { capture: true });
    window.removeEventListener('resize', this.reposition);
  }

  /** "V" shortcut: hide/show for this page session (not persisted). */
  toggleSession(anchor: HTMLVideoElement | null): boolean {
    this.sessionHidden = !this.sessionHidden;
    if (this.sessionHidden) this.hide();
    else this.show(anchor);
    return !this.sessionHidden;
  }

  forget(el: Element): void {
    if (this.anchor === el) {
      this.anchor = null;
      this.hide();
    }
  }

  // ---- internals ------------------------------------------------------------------------------

  private ensure(): void {
    if (this.host) return;
    const host = document.createElement('div');
    host.setAttribute('data-speedup-overlay', '');
    // Inline !important so page CSS (e.g. `div { display:none }`) cannot hide or move the host.
    host.style.cssText =
      'all:initial!important;position:fixed!important;top:0!important;left:0!important;width:0!important;height:0!important;' +
      'z-index:2147483647!important;pointer-events:none!important;display:block!important;';
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    const pill = document.createElement('div');
    pill.className = 'pill';
    pill.setAttribute('role', 'status');
    const minus = document.createElement('button');
    minus.textContent = '−';
    minus.title = 'Slower';
    const label = document.createElement('span');
    label.className = 'label';
    const plus = document.createElement('button');
    plus.textContent = '+';
    plus.title = 'Faster';
    pill.append(minus, label, plus);
    root.append(style, pill);

    // Keep every pointer interaction away from the player (no accidental pause/fullscreen).
    for (const type of ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerup', 'contextmenu'] as const) {
      pill.addEventListener(type, (e) => e.stopPropagation());
    }
    minus.addEventListener('click', () => this.deps.step(-1));
    plus.addEventListener('click', () => this.deps.step(1));
    pill.addEventListener('pointerdown', (e) => this.startDrag(e));
    pill.addEventListener('pointermove', (e) => this.moveDrag(e));
    pill.addEventListener('pointerup', (e) => this.endDrag(e));
    pill.addEventListener('pointercancel', (e) => this.endDrag(e));
    pill.addEventListener('pointerenter', () => clearTimeout(this.hideTimer));
    pill.addEventListener('pointerleave', () => this.scheduleHide());

    this.host = host;
    this.pill = pill;
    this.label = label;
  }

  private mount(): void {
    if (!this.host) return;
    const fs = document.fullscreenElement;
    // A <video> in fullscreen renders alone in the top layer; children cannot appear above it.
    const parent = fs && !(fs instanceof HTMLMediaElement) ? fs : document.documentElement;
    if (this.host.parentNode !== parent) parent.appendChild(this.host);
    this.place();
  }

  private render(): void {
    const flashing = performance.now() < this.flashUntil;
    this.label.textContent = flashing ? this.flashText : this.deps.speedText(this.anchor);
    if (flashing) {
      setTimeout(() => this.visible && this.render(), this.flashUntil - performance.now() + 10);
    }
  }

  private place(): void {
    if (!this.host || this.drag) return;
    const r = this.anchor?.getBoundingClientRect();
    if (!r || r.width < 40 || r.height < 30) {
      this.setXY(DEFAULT_OFFSET_PX, DEFAULT_OFFSET_PX);
      return;
    }
    const pos = this.deps.position();
    const pw = this.pill.offsetWidth || 110;
    const ph = this.pill.offsetHeight || 26;
    const x = pos ? r.left + pos.x * r.width : r.left + DEFAULT_OFFSET_PX;
    const y = pos ? r.top + pos.y * r.height : r.top + DEFAULT_OFFSET_PX;
    this.setXY(clamp(x, r.left, r.right - pw), clamp(y, r.top, r.bottom - ph));
  }

  private setXY(x: number, y: number): void {
    this.pill.style.left = `${Math.round(x)}px`;
    this.pill.style.top = `${Math.round(y)}px`;
  }

  private scheduleHide(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.hide(), this.deps.autoHideMs());
  }

  private startDrag(e: PointerEvent): void {
    if (e.button !== 0 || (e.target as Element).tagName === 'BUTTON') return;
    e.stopPropagation();
    const rect = this.pill.getBoundingClientRect();
    this.drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
    this.pill.setPointerCapture(e.pointerId);
    this.pill.classList.add('dragging');
    clearTimeout(this.hideTimer);
  }

  private moveDrag(e: PointerEvent): void {
    if (!this.drag) return;
    this.drag.moved = true;
    this.setXY(e.clientX - this.drag.dx, e.clientY - this.drag.dy);
  }

  private endDrag(e: PointerEvent): void {
    if (!this.drag) return;
    const moved = this.drag.moved;
    this.drag = null;
    this.pill.classList.remove('dragging');
    if (this.pill.hasPointerCapture(e.pointerId)) this.pill.releasePointerCapture(e.pointerId);
    const r = this.anchor?.getBoundingClientRect();
    if (moved && r && r.width > 0 && r.height > 0) {
      const p = this.pill.getBoundingClientRect();
      this.deps.savePosition({
        x: clamp((p.left - r.left) / r.width, 0, 1),
        y: clamp((p.top - r.top) / r.height, 0, 1)
      });
    }
    this.place();
    this.scheduleHide();
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}
