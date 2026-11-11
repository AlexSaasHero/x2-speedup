// "Time saved" accounting: pure helpers shared by content (tracking), background (aggregation)
// and popup (display). Storage keeps daily aggregates only — never raw events.

export interface DayStats {
  /** Seconds of content minus seconds of real time (can be negative below 1x). */
  saved: number;
  /** Real seconds spent playing media. */
  watched: number;
}

export interface TimeSavedStats {
  version: 1;
  days: Record<string, DayStats>;
  total: DayStats;
}

export const STATS_KEY = 'timeSaved';
/** storage.session key: deltas not yet written to storage.local. */
export const STATS_BUFFER_KEY = 'timeSavedBuffer';
/** Minimum interval between storage.local writes of the aggregates. */
export const STATS_WRITE_INTERVAL_MS = 30_000;

export interface StatsBuffer {
  days: Record<string, DayStats>;
  lastWrite: number;
}

export function emptyBuffer(): StatsBuffer {
  return { days: {}, lastWrite: 0 };
}

export function bufferAdd(buf: StatsBuffer | undefined, day: string, delta: DayStats): StatsBuffer {
  const b: StatsBuffer = { days: { ...(buf?.days ?? {}) }, lastWrite: buf?.lastWrite ?? 0 };
  const d = b.days[day] ?? { saved: 0, watched: 0 };
  b.days[day] = { saved: d.saved + delta.saved, watched: d.watched + delta.watched };
  return b;
}

/** Apply every buffered day to the persistent stats. */
export function applyBuffer(stats: TimeSavedStats, buf: StatsBuffer | undefined, now = new Date()): TimeSavedStats {
  let out = validateStats(stats);
  for (const [day, delta] of Object.entries(buf?.days ?? {})) out = addStats(out, day, delta, now);
  return out;
}
export const STATS_RETENTION_DAYS = 400;

export function emptyStats(): TimeSavedStats {
  return { version: 1, days: {}, total: { saved: 0, watched: 0 } };
}

/** Local calendar day, e.g. "2026-11-11". */
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function validateStats(raw: unknown): TimeSavedStats {
  const out = emptyStats();
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Partial<TimeSavedStats>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  if (r.days && typeof r.days === 'object') {
    for (const [k, v] of Object.entries(r.days)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') out.days[k] = { saved: num(v.saved), watched: num(v.watched) };
    }
  }
  if (r.total) out.total = { saved: num(r.total.saved), watched: num(r.total.watched) };
  return out;
}

export function addStats(stats: TimeSavedStats, day: string, delta: DayStats, now = new Date()): TimeSavedStats {
  const next = validateStats(stats);
  const d = next.days[day] ?? { saved: 0, watched: 0 };
  next.days[day] = { saved: d.saved + delta.saved, watched: d.watched + delta.watched };
  next.total = { saved: next.total.saved + delta.saved, watched: next.total.watched + delta.watched };
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - STATS_RETENTION_DAYS);
  const cutoffKey = dayKey(cutoff);
  for (const k of Object.keys(next.days)) if (k < cutoffKey) delete next.days[k];
  return next;
}

/** Monday of the week containing `d` (local time). */
export function weekStart(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

export interface StatsSummary {
  today: number;
  week: number;
  total: number;
}

export function summarize(stats: TimeSavedStats, now = new Date()): StatsSummary {
  const s = validateStats(stats);
  const today = dayKey(now);
  const monday = dayKey(weekStart(now));
  let week = 0;
  for (const [k, v] of Object.entries(s.days)) if (k >= monday && k <= today) week += v.saved;
  return { today: s.days[today]?.saved ?? 0, week, total: s.total.saved };
}

/** 11592 → "3h 13m", 95 → "1m 35s", negative → "0m". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}

/**
 * Accumulates saved time for one media element from (mediaTime, wallTime) samples.
 * Seeks, pauses and jumps are ignored: only continuous playback counts.
 */
export class SavedTimeTracker {
  private lastMedia: number | null = null;
  private lastWall = 0;
  saved = 0;
  watched = 0;

  sample(mediaTime: number, wallMs: number, playing: boolean): void {
    if (!playing || !Number.isFinite(mediaTime)) {
      this.lastMedia = null;
      return;
    }
    if (this.lastMedia !== null) {
      const dMedia = mediaTime - this.lastMedia;
      const dWall = (wallMs - this.lastWall) / 1000;
      // A real playback step: forward, and not faster than 16x (+ slack) — otherwise it was a seek.
      if (dWall > 0 && dWall < 5 && dMedia > 0 && dMedia <= dWall * 17 + 0.5) {
        this.saved += dMedia - dWall;
        this.watched += dWall;
      }
    }
    this.lastMedia = mediaTime;
    this.lastWall = wallMs;
  }

  reset(): void {
    this.lastMedia = null;
  }

  /** Take the accumulated delta (for flushing) and zero the counters. */
  drain(): DayStats {
    const out = { saved: this.saved, watched: this.watched };
    this.saved = 0;
    this.watched = 0;
    return out;
  }
}
