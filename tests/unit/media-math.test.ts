import { describe, expect, it } from 'vitest';
import { FREE_MAX_SPEED, PRO_MAX_SPEED } from '../../src/config/plans';
import { ReapplyBudget, roundSpeed, sameSpeed, seekTarget, stepSpeed } from '../../src/shared/media-math';

describe('speed math', () => {
  it('rounds away float noise', () => {
    expect(roundSpeed(1.1 + 0.1)).toBe(1.2);
    expect(sameSpeed(1.2, 1.2000001)).toBe(true);
    expect(sameSpeed(1.2, 1.25)).toBe(false);
  });

  it('steps within plan limits', () => {
    expect(stepSpeed(1, 0.1, false)).toBe(1.1);
    expect(stepSpeed(FREE_MAX_SPEED, 0.1, false)).toBe(FREE_MAX_SPEED);
    expect(stepSpeed(FREE_MAX_SPEED, 0.1, true)).toBe(roundSpeed(FREE_MAX_SPEED + 0.1));
    expect(stepSpeed(PRO_MAX_SPEED, 1, true)).toBe(PRO_MAX_SPEED);
    expect(stepSpeed(0.1, -0.1, true)).toBe(0.1);
  });
});

describe('seekTarget', () => {
  it('clamps to [0, duration]', () => {
    expect(seekTarget(5, -10, 100)).toBe(0);
    expect(seekTarget(95, 10, 100)).toBe(100);
    expect(seekTarget(50, 10, 100)).toBe(60);
  });

  it('uses the seekable window for live streams (duration = Infinity)', () => {
    const live = [{ start: 1000, end: 1600 }];
    expect(seekTarget(1595, 10, Infinity, live)).toBe(1600);
    expect(seekTarget(1005, -10, Infinity, live)).toBe(1000);
  });

  it('handles unknown duration without seekable ranges', () => {
    expect(seekTarget(5, 10, NaN)).toBe(15);
    expect(seekTarget(NaN, 10, NaN)).toBe(10);
  });
});

describe('ReapplyBudget', () => {
  it('stops after the limit and recovers after the cooldown', () => {
    const b = new ReapplyBudget(3, 1000, 2000);
    expect([b.allow(0), b.allow(10), b.allow(20)]).toEqual([true, true, true]);
    expect(b.allow(30)).toBe(false);
    expect(b.allow(1500)).toBe(false);
    expect(b.allow(2100)).toBe(true);
  });

  it('allows steady re-applies spread over time', () => {
    const b = new ReapplyBudget(3, 1000, 2000);
    for (let t = 0; t < 10_000; t += 400) expect(b.allow(t)).toBe(true);
  });
});
