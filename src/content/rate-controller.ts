// Owns the playback speed of every media element in this frame.
//
// Persistence model: each element has a desired speed (defaulting to the frame speed). When a
// player changes playbackRate behind our back (ads, quality switch, playlist, SPA navigation,
// element swap) we re-apply — through a ReapplyBudget so a player that keeps fighting cannot
// cause an infinite loop. When the *user* changes speed through the player's own controls
// (a pointer/key gesture inside the player shortly before the ratechange) we adopt that speed.
import { FREE_MAX_SPEED, clampSpeed, formatSpeed } from '../config/plans';
import { ReapplyBudget, rangesFrom, roundSpeed, sameSpeed, seekTarget } from '../shared/media-math';
import { t } from '../shared/i18n';
import { debug } from './log';
import { isMedia, isVideo, type Media, type MediaRegistry } from './media-registry';
import type { ContentSettings } from './settings';

/** Players such as YouTube clamp anything above 2x; hide our >2x ratechange events from them. */
const PAGE_NATIVE_MAX_SPEED = 2;
const USER_GESTURE_WINDOW_MS = 1000;
/** Rate changes right after a (re)load are the player initialising, never the user. */
const LOAD_SETTLE_MS = 1500;
const PLAYER_ANCESTOR_DEPTH = 8;
const PERSIST_DEBOUNCE_MS = 300;

/** Temporary speeds layered on top of the user's speed, highest priority first. */
export type OverrideSource = 'ads' | 'hold' | 'silence';
const OVERRIDE_PRIORITY: readonly OverrideSource[] = ['ads', 'hold', 'silence'];

export interface SetSpeedOptions {
  /** Store as the remembered speed (false for rule-driven changes). */
  persist?: boolean;
  /** Label to flash instead of the plain speed. */
  label?: string;
}

export interface Feedback {
  /** Show a transient label (speed, "+10s", …) anchored to the media if possible. */
  flash(label: string, media: Media | null): void;
  /** Speed changed: refresh any persistent display. */
  speedChanged(media: Media | null): void;
}

export class RateController {
  private ready = false;
  private frameSpeed = 1;
  private readonly desired = new WeakMap<Media, number>();
  private readonly budgets = new WeakMap<Media, ReapplyBudget>();
  private readonly loadedAt = new WeakMap<Media, number>();
  private readonly wired = new WeakSet<Media>();
  private readonly handled = new WeakSet<Event>();
  private readonly loopedByUs = new WeakSet<Media>();
  private readonly overrides = new WeakMap<Media, Partial<Record<OverrideSource, number>>>();
  private lastGesture: { t: number; path: EventTarget[] } | null = null;
  private speedBeforeReset: number | null = null;
  private persistTimer = 0;

  constructor(
    private readonly registry: MediaRegistry,
    private readonly settings: () => ContentSettings,
    private readonly feedback: Feedback
  ) {}

  /** Must run synchronously at document_start so our capture listener precedes page scripts. */
  installEarlyListeners(): void {
    window.addEventListener('ratechange', (e) => this.onRateChange(e), true);
    const gesture = (e: Event) => {
      this.lastGesture = { t: performance.now(), path: e.composedPath() };
    };
    window.addEventListener('pointerdown', gesture, true);
    window.addEventListener('keydown', gesture, true);
  }

  /** `ruleSpeed`: speed from a matching rule, which wins over the remembered speed. */
  init(ruleSpeed: number | null = null): void {
    const s = this.settings();
    const start = ruleSpeed ?? (s.rememberSpeed ? s.defaultSpeed : 1);
    this.frameSpeed = clampSpeed(start, s.pro);
    this.ready = true;
    this.registry.all().forEach((m) => this.apply(m));
  }

  /** Called by the registry for every newly discovered element. */
  attach(m: Media): void {
    if (!this.wired.has(m)) {
      this.wired.add(m);
      // Per-element listeners: media events are not composed, so elements inside shadow roots
      // never reach the window-level capture listener.
      m.addEventListener('ratechange', (e) => this.onRateChange(e), true);
      const reload = () => this.loadedAt.set(m, performance.now());
      m.addEventListener('loadstart', reload);
      m.addEventListener('emptied', reload);
      for (const type of ['loadstart', 'loadedmetadata', 'play', 'emptied'] as const) {
        m.addEventListener(type, () => this.apply(m));
      }
    }
    if (!this.loadedAt.has(m)) this.loadedAt.set(m, performance.now());
    this.apply(m);
  }

  detach(m: Media): void {
    this.desired.delete(m);
  }

  /** The user's speed for `m` (ignores temporary overrides). */
  baseSpeedOf(m: Media | null): number {
    return (m && this.desired.get(m)) ?? this.frameSpeed;
  }

  /** The rate actually enforced on `m` (override if any, else the user's speed). */
  speedOf(m: Media | null): number {
    if (m) {
      const o = this.overrides.get(m);
      if (o) for (const src of OVERRIDE_PRIORITY) if (o[src] !== undefined) return o[src]!;
    }
    return this.baseSpeedOf(m);
  }

  activeOverride(m: Media | null): OverrideSource | null {
    const o = m && this.overrides.get(m);
    return (o && OVERRIDE_PRIORITY.find((src) => o[src] !== undefined)) || null;
  }

  currentSpeed(): number {
    return this.baseSpeedOf(this.registry.primary());
  }

  /** Set or clear (`null`) a temporary speed. Not persisted, not clamped to the user's step. */
  setOverride(m: Media, source: OverrideSource, speed: number | null): void {
    const o = { ...(this.overrides.get(m) ?? {}) };
    if (speed === null) delete o[source];
    else o[source] = clampSpeed(speed, this.settings().pro);
    this.overrides.set(m, o);
    this.apply(m);
    this.feedback.speedChanged(m);
  }

  targets(): Media[] {
    if (this.settings().applyToAll) return this.registry.all();
    const p = this.registry.primary();
    return p ? [p] : [];
  }

  // ---- user-facing operations ---------------------------------------------------------------

  setSpeed(requested: number, scope: Media[] = this.targets(), opts: SetSpeedOptions = {}): number {
    const s = this.settings();
    const next = clampSpeed(requested, s.pro);
    this.frameSpeed = next;
    for (const m of scope) {
      this.desired.set(m, next);
      this.apply(m);
    }
    if (opts.persist !== false) this.persist(next);
    const anchor = scope[0] ?? this.registry.primary();
    const limited = !s.pro && roundSpeed(requested) > FREE_MAX_SPEED;
    this.feedback.flash(
      limited ? t('overlay_free_max', [formatSpeed(FREE_MAX_SPEED)]) : opts.label ?? formatSpeed(next),
      anchor
    );
    this.feedback.speedChanged(anchor);
    this.updateBadge(next);
    return next;
  }

  step(direction: 1 | -1): number {
    // Unclamped on purpose: setSpeed clamps and explains the free limit when it is hit.
    return this.setSpeed(roundSpeed(this.currentSpeed() + direction * this.settings().speedStep));
  }

  /** VSC-style reset: 1x, pressing again returns to the previous speed. */
  toggleReset(): number {
    const current = this.currentSpeed();
    if (!sameSpeed(current, 1)) {
      this.speedBeforeReset = current;
      return this.setSpeed(1);
    }
    return this.setSpeed(this.speedBeforeReset ?? this.settings().favoriteSpeed);
  }

  togglePreferred(): number {
    const fav = clampSpeed(this.settings().favoriteSpeed, this.settings().pro);
    return this.setSpeed(sameSpeed(this.currentSpeed(), fav) ? 1 : fav);
  }

  seek(deltaSeconds: number): number | null {
    const m = this.registry.primary();
    if (!m) return null;
    m.currentTime = seekTarget(m.currentTime, deltaSeconds, m.duration, rangesFrom(m.seekable));
    this.feedback.flash(`${deltaSeconds > 0 ? '+' : '−'}${Math.abs(deltaSeconds)}s`, m);
    return m.currentTime;
  }

  /** Re-apply everything (settings changed, SPA navigation, plan change). */
  refresh(): void {
    const s = this.settings();
    this.frameSpeed = clampSpeed(this.frameSpeed, s.pro);
    for (const m of this.registry.all()) {
      const d = this.desired.get(m);
      if (d !== undefined) this.desired.set(m, clampSpeed(d, s.pro));
      this.apply(m);
    }
    this.feedback.speedChanged(this.registry.primary());
  }

  // ---- enforcement ----------------------------------------------------------------------------

  private apply(m: Media): void {
    if (!this.ready) return;
    const s = this.settings();
    const want = this.speedOf(m);
    try {
      if (!sameSpeed(m.playbackRate, want)) m.playbackRate = want;
      if (!sameSpeed(m.defaultPlaybackRate, want)) m.defaultPlaybackRate = want;
      if (m.preservesPitch !== s.preservesPitch) m.preservesPitch = s.preservesPitch;
      if (s.loopVideo && !m.loop) {
        m.loop = true;
        this.loopedByUs.add(m);
      } else if (!s.loopVideo && this.loopedByUs.has(m)) {
        m.loop = false;
        this.loopedByUs.delete(m);
      }
    } catch (err) {
      // Some players (e.g. MSE in error state) throw on playbackRate; never break the page.
      debug('apply failed', err);
    }
  }

  private onRateChange(e: Event): void {
    if (!this.ready || this.handled.has(e)) return;
    const m = e.target;
    if (!isMedia(m)) return;
    this.handled.add(e);
    this.registry.ensure(m);

    const want = this.speedOf(m);
    const rate = m.playbackRate;

    if (sameSpeed(rate, want)) {
      if (want > PAGE_NATIVE_MAX_SPEED) e.stopImmediatePropagation();
      this.feedback.speedChanged(m);
      return;
    }

    if (this.isUserNativeChange(m)) {
      debug('accepting native speed change', rate);
      const s = this.settings();
      const next = clampSpeed(rate, s.pro);
      this.desired.set(m, next);
      this.frameSpeed = next;
      if (!sameSpeed(next, rate)) this.apply(m);
      this.persist(next);
      this.feedback.flash(formatSpeed(next), m);
      this.feedback.speedChanged(m);
      this.updateBadge(next);
      return;
    }

    let budget = this.budgets.get(m);
    if (!budget) this.budgets.set(m, (budget = new ReapplyBudget()));
    if (!budget.allow(performance.now())) {
      debug('player keeps resetting playbackRate; backing off', rate, '→', want);
      return;
    }
    e.stopImmediatePropagation();
    this.apply(m);
  }

  private isUserNativeChange(m: Media): boolean {
    const g = this.lastGesture;
    const now = performance.now();
    if (!g || now - g.t > USER_GESTURE_WINDOW_MS) return false;
    if (now - (this.loadedAt.get(m) ?? 0) < LOAD_SETTLE_MS) return false;
    return gestureInsidePlayer(g.path, m);
  }

  private persist(speed: number): void {
    const s = this.settings();
    clearTimeout(this.persistTimer);
    this.persistTimer = window.setTimeout(() => {
      if (s.rememberSpeed) chrome.storage.local.set({ defaultSpeed: speed }).catch(() => {});
    }, PERSIST_DEBOUNCE_MS);
  }

  private updateBadge(speed: number): void {
    chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', speed }).catch(() => {});
  }

  /** Exposed for the popup "video info" messages. */
  describe(m: Media) {
    return {
      currentTime: m.currentTime,
      duration: Number.isFinite(m.duration) ? m.duration : 0,
      isLive: m.duration === Number.POSITIVE_INFINITY,
      isPlaying: !m.paused,
      isMuted: m.muted,
      isVideo: isVideo(m)
    };
  }
}

/** True when the gesture's event path contains the media or one of its near ancestors (the player). */
function gestureInsidePlayer(path: EventTarget[], m: Media): boolean {
  const inPath = new Set(path);
  let node: Node | null = m;
  for (let depth = 0; node && depth <= PLAYER_ANCESTOR_DEPTH; depth++) {
    if (node === document.body || node === document.documentElement) return false;
    if (inPath.has(node)) return true;
    const parent: Node | null = node.parentNode;
    node = parent instanceof ShadowRoot ? parent.host : parent;
  }
  return false;
}
