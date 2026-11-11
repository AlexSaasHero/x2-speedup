// The one place that decides whether the user has Pro access.
// Every surface (content script, popup, background) must go through isPro()/can().
import { planLimits, type Feature } from '../config/plans';

export interface LicenseSnapshot {
  isPro?: unknown;
  licenseKey?: unknown;
}

/** Storage keys that influence entitlement — watch these in storage.onChanged. */
export const LICENSE_KEYS = ['isPro', 'licenseKey'] as const;

/**
 * NOTE (BUGS.md #1): baseline behaviour is preserved on purpose — any stored key longer than
 * 3 characters grants Pro. Phase 3 replaces this with server-validated license state.
 */
export function isPro(state: LicenseSnapshot | null | undefined): boolean {
  if (!state) return false;
  if (state.isPro === true) return true;
  return typeof state.licenseKey === 'string' && state.licenseKey.trim().length > 3;
}

export function can(feature: Feature, state: LicenseSnapshot | null | undefined): boolean {
  return planLimits(isPro(state)).features[feature];
}

/** True when any of the given storage changes may flip entitlement. */
export function affectsEntitlement(changes: Record<string, unknown>): boolean {
  return LICENSE_KEYS.some((k) => k in changes);
}
