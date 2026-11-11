import { describe, expect, it } from 'vitest';
import { SavedTimeTracker, addStats, dayKey, emptyStats, formatDuration, summarize, validateStats, weekStart } from '../../src/shared/stats';

describe('SavedTimeTracker', () => {
  it('counts content time minus real time during continuous playback', () => {
    const t = new SavedTimeTracker();
    // 2x for 10 s of real time → 20 s of content → 10 s saved
    for (let i = 0; i <= 40; i++) t.sample(i * 0.5, i * 250, true);
    expect(t.saved).toBeCloseTo(10, 5);
    expect(t.watched).toBeCloseTo(10, 5);
  });

  it('ignores seeks, pauses and backwards jumps', () => {
    const t = new SavedTimeTracker();
    t.sample(0, 0, true);
    t.sample(100, 250, true); // seek forward
    t.sample(101, 1250, true); // 1x for 1s
    t.sample(50, 1500, true); // seek back
    t.sample(51, 2500, false); // paused
    t.sample(52, 3500, true);
    t.sample(54, 4500, true); // 2x for 1 s → +1
    expect(t.saved).toBeCloseTo(1, 5);
    expect(t.watched).toBeCloseTo(2, 5);
  });

  it('slow playback counts as negative', () => {
    const t = new SavedTimeTracker();
    t.sample(0, 0, true);
    t.sample(0.5, 1000, true);
    expect(t.saved).toBeCloseTo(-0.5, 5);
  });

  it('drain returns and zeroes the counters', () => {
    const t = new SavedTimeTracker();
    t.sample(0, 0, true);
    t.sample(2, 1000, true);
    expect(t.drain()).toEqual({ saved: 1, watched: 1 });
    expect(t.drain()).toEqual({ saved: 0, watched: 0 });
  });
});

describe('aggregates', () => {
  const wed = new Date(2026, 10, 11, 15); // Wed 11 Nov 2026

  it('week starts on Monday', () => {
    expect(dayKey(weekStart(wed))).toBe('2026-11-09');
    expect(dayKey(weekStart(new Date(2026, 10, 15)))).toBe('2026-11-09'); // Sunday
  });

  it('adds daily deltas and summarizes today / week / total', () => {
    let s = emptyStats();
    s = addStats(s, '2026-11-08', { saved: 100, watched: 200 }, wed); // last week
    s = addStats(s, '2026-11-09', { saved: 60, watched: 60 }, wed);
    s = addStats(s, '2026-11-11', { saved: 30, watched: 30 }, wed);
    s = addStats(s, '2026-11-11', { saved: 10, watched: 10 }, wed);
    expect(summarize(s, wed)).toEqual({ today: 40, week: 100, total: 200 });
    expect(s.days['2026-11-11']).toEqual({ saved: 40, watched: 40 });
  });

  it('prunes days older than the retention window', () => {
    const s = addStats({ ...emptyStats(), days: { '2024-01-01': { saved: 5, watched: 5 } } }, '2026-11-11', { saved: 1, watched: 1 }, wed);
    expect(Object.keys(s.days)).toEqual(['2026-11-11']);
  });

  it('validates garbage', () => {
    expect(validateStats(null)).toEqual(emptyStats());
    expect(validateStats({ days: { bad: { saved: 1 }, '2026-11-11': { saved: 'x', watched: 2 } } }).days).toEqual({
      '2026-11-11': { saved: 0, watched: 2 }
    });
  });

  it('formats durations', () => {
    expect(formatDuration(11592)).toBe('3h 13m');
    expect(formatDuration(95)).toBe('1m 35s');
    expect(formatDuration(-20)).toBe('0s');
  });
});
