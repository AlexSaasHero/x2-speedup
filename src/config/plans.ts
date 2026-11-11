// Single source of truth for Free vs Pro limits and feature gating.
// Change limits here only — content script, popup and background all read from this file.

export type PlanId = 'free' | 'pro';

/** Features that can be gated per plan. Add new Pro features here first. */
export type Feature =
  | 'customHotkeys'
  | 'skipTime'
  | 'frameStep'
  | 'checkpoints';

export interface PlanLimits {
  minSpeed: number;
  maxSpeed: number;
  features: Record<Feature, boolean>;
}

/** Absolute bounds supported by the extension (HTML media allows more, browsers degrade past 16x). */
export const ABSOLUTE_MIN_SPEED = 0.1;
export const ABSOLUTE_MAX_SPEED = 16;

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    minSpeed: ABSOLUTE_MIN_SPEED,
    maxSpeed: 4,
    features: {
      customHotkeys: true,
      skipTime: true,
      frameStep: false,
      checkpoints: false
    }
  },
  pro: {
    minSpeed: ABSOLUTE_MIN_SPEED,
    maxSpeed: ABSOLUTE_MAX_SPEED,
    features: {
      customHotkeys: true,
      skipTime: true,
      frameStep: true,
      checkpoints: true
    }
  }
};

export const FREE_MIN_SPEED = PLANS.free.minSpeed;
export const FREE_MAX_SPEED = PLANS.free.maxSpeed;
export const PRO_MIN_SPEED = PLANS.pro.minSpeed;
export const PRO_MAX_SPEED = PLANS.pro.maxSpeed;

export function planLimits(pro: boolean): PlanLimits {
  return pro ? PLANS.pro : PLANS.free;
}

/** Clamp a requested speed to the plan's range, rounded to 2 decimals. Invalid input → 1.0. */
export function clampSpeed(value: unknown, pro: boolean): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(num)) return 1;
  const { minSpeed, maxSpeed } = planLimits(pro);
  return parseFloat(Math.min(Math.max(num, minSpeed), maxSpeed).toFixed(2));
}

/** Human label for a speed, e.g. 2 → "2.0x", 1.25 → "1.25x". */
export function formatSpeed(value: number): string {
  const num = Number.isFinite(value) ? value : 1;
  return Number.isInteger(Math.round(num * 1000) / 100) ? `${num.toFixed(1)}x` : `${num.toFixed(2)}x`;
}
