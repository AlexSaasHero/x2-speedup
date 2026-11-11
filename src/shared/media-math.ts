// Pure helpers for speed stepping, seeking and re-apply throttling.
import { clampSpeed } from '../config/plans';

export const SPEED_EPSILON = 0.01;

export function roundSpeed(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sameSpeed(a: number, b: number): boolean {
  return Math.abs(a - b) < SPEED_EPSILON;
}

/** current ± step, rounded and clamped to the plan. */
export function stepSpeed(current: number, delta: number, pro: boolean): number {
  return clampSpeed(roundSpeed(current + delta), pro);
}

export interface TimeRange {
  start: number;
  end: number;
}

export function rangesFrom(tr: { length: number; start(i: number): number; end(i: number): number }): TimeRange[] {
  const out: TimeRange[] = [];
  for (let i = 0; i < tr.length; i++) out.push({ start: tr.start(i), end: tr.end(i) });
  return out;
}

/**
 * Target time for a relative seek, clamped to [0, duration].
 * Live streams report duration = Infinity: clamp to the seekable window instead.
 */
export function seekTarget(current: number, delta: number, duration: number, seekable: readonly TimeRange[] = []): number {
  let min = 0;
  let max = Number.POSITIVE_INFINITY;
  if (Number.isFinite(duration) && duration > 0) {
    max = duration;
  } else if (seekable.length) {
    min = seekable[0].start;
    max = seekable[seekable.length - 1].end;
  }
  const base = Number.isFinite(current) ? current : 0;
  return Math.min(Math.max(base + delta, min), max);
}

/**
 * Limits how often we fight a player that keeps resetting playbackRate.
 * After `limit` re-applies inside `windowMs` we back off for `cooldownMs` (no infinite loops).
 */
export class ReapplyBudget {
  private stamps: number[] = [];
  private blockedUntil = 0;

  constructor(
    private readonly limit = 8,
    private readonly windowMs = 1000,
    private readonly cooldownMs = 3000
  ) {}

  allow(now: number): boolean {
    if (now < this.blockedUntil) return false;
    this.stamps = this.stamps.filter((t) => now - t < this.windowMs);
    if (this.stamps.length >= this.limit) {
      this.blockedUntil = now + this.cooldownMs;
      this.stamps = [];
      return false;
    }
    this.stamps.push(now);
    return true;
  }
}
