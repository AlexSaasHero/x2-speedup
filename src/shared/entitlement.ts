// The one place that decides whether the user has Pro access.
// Every surface (content script, popup, background, options) must go through isPro()/can().
import { planLimits, type Feature } from '../config/plans';
import { licenseGrantsPro, validateLicense } from './license';

export interface LicenseSnapshot {
  license?: unknown;
}

/** Storage keys that influence entitlement — watch these in storage.onChanged. */
export const LICENSE_KEYS = ['license'] as const;

export function isPro(state: LicenseSnapshot | null | undefined, now = Date.now()): boolean {
  return !!state && licenseGrantsPro(validateLicense(state.license), now);
}

export function can(feature: Feature, state: LicenseSnapshot | null | undefined, now = Date.now()): boolean {
  return planLimits(isPro(state, now)).features[feature];
}

/** True when any of the given storage changes may flip entitlement. */
export function affectsEntitlement(changes: Record<string, unknown>): boolean {
  return LICENSE_KEYS.some((k) => k in changes);
}
