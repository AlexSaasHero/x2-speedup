// Tracks time saved in this frame and hands daily deltas to the background worker every few
// seconds while media plays (and when the page is hidden). The worker buffers them in
// storage.session and writes the daily aggregates to storage.local at most once every 30 s.
import { SavedTimeTracker, dayKey } from '../shared/stats';
import type { Media } from './media-registry';

const FLUSH_INTERVAL_MS = 5_000;
const MIN_FLUSH_SECONDS = 0.5;

export class StatsTracker {
  private readonly trackers = new WeakMap<Media, SavedTimeTracker>();
  private pending = { saved: 0, watched: 0 };
  /** Saved during this page session (shown in the popup). */
  sessionSaved = 0;
  private timer = 0;
  private lastFlush = 0;

  constructor() {
    const flushNow = () => this.flush(true);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushNow());
    window.addEventListener('pagehide', flushNow);
  }

  attach(m: Media): void {
    if (this.trackers.has(m)) return;
    const t = new SavedTimeTracker();
    this.trackers.set(m, t);
    const sample = () => this.sample(m, t);
    m.addEventListener('timeupdate', sample);
    m.addEventListener('pause', () => {
      sample();
      t.reset();
    });
    m.addEventListener('seeking', () => t.reset());
    m.addEventListener('emptied', () => t.reset());
  }

  private sample(m: Media, t: SavedTimeTracker): void {
    t.sample(m.currentTime, performance.now(), !m.paused && !m.ended && !m.seeking);
    const d = t.drain();
    if (!d.watched) return;
    this.pending.saved += d.saved;
    this.pending.watched += d.watched;
    this.sessionSaved += d.saved;
    // Re-arm the flush timer only while there is something to write.
    if (!this.timer) this.timer = window.setTimeout(() => this.flush(false), FLUSH_INTERVAL_MS);
  }

  private flush(force: boolean): void {
    clearTimeout(this.timer);
    this.timer = 0;
    const now = Date.now();
    if (!force && now - this.lastFlush < FLUSH_INTERVAL_MS) {
      this.timer = window.setTimeout(() => this.flush(false), FLUSH_INTERVAL_MS - (now - this.lastFlush));
      return;
    }
    if (this.pending.watched < MIN_FLUSH_SECONDS) return;
    const delta = this.pending;
    this.pending = { saved: 0, watched: 0 };
    this.lastFlush = now;
    chrome.runtime.sendMessage({ action: 'STATS_ADD', day: dayKey(new Date()), delta }).catch(() => {
      // Worker unavailable (extension updated/reloaded): keep the numbers for the next flush.
      this.pending.saved += delta.saved;
      this.pending.watched += delta.watched;
    });
  }
}
