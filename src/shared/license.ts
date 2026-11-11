// License model and pure decision logic. Network calls live in src/background/license.ts.
//
// - Validation happens in the service worker, at most once a day (plus on activation).
// - If the server cannot be reached, Pro stays on until LICENSE_GRACE_MS after the last
//   successful validation (1 day of normal check interval + 7 days offline grace).
// - Only an explicit answer from a server ("expired", "disabled", "invalid") turns Pro off;
//   network errors never do.
//
// NOTE: the cached state is a timestamped record in chrome.storage, not cryptographically
// signed — the license endpoint does not return a signature to verify. See ROADMAP_IMPL §3.1.

export type LicenseStatus = 'none' | 'active' | 'expired' | 'revoked' | 'invalid' | 'limit';

export interface LicenseState {
  key: string;
  status: LicenseStatus;
  /** Last time we asked a server (success or not). */
  lastCheckedAt: number;
  /** Last time a server confirmed the key as valid. */
  lastValidAt: number;
  /** Which source last answered: our endpoint, Lemon Squeezy, or the dev master key. */
  source: 'x2' | 'lemonsqueezy' | 'dev' | 'migrated' | '';
  /** When the license (e.g. trial) ends, if the server says so. */
  expiresAt: number | null;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const LICENSE_CHECK_INTERVAL_MS = DAY_MS;
export const LICENSE_OFFLINE_GRACE_MS = 7 * DAY_MS;
export const LICENSE_GRACE_MS = LICENSE_CHECK_INTERVAL_MS + LICENSE_OFFLINE_GRACE_MS;

export const X2_VALIDATE_URL = 'https://x2-speedup.vercel.app/api/validate-license';
export const LS_VALIDATE_URL = 'https://api.lemonsqueezy.com/v1/licenses/validate';

export function noLicense(): LicenseState {
  return { key: '', status: 'none', lastCheckedAt: 0, lastValidAt: 0, source: '', expiresAt: null };
}

export function validateLicense(raw: unknown): LicenseState {
  const out = noLicense();
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;
  const statuses: LicenseStatus[] = ['none', 'active', 'expired', 'revoked', 'invalid', 'limit'];
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  out.key = typeof r.key === 'string' ? r.key.trim() : '';
  out.status = statuses.includes(r.status as LicenseStatus) ? (r.status as LicenseStatus) : out.key ? 'invalid' : 'none';
  out.lastCheckedAt = num(r.lastCheckedAt);
  out.lastValidAt = num(r.lastValidAt);
  out.source = (['x2', 'lemonsqueezy', 'dev', 'migrated'] as const).find((s) => s === r.source) ?? '';
  out.expiresAt = typeof r.expiresAt === 'number' && Number.isFinite(r.expiresAt) ? r.expiresAt : null;
  return out;
}

/** True while the license grants Pro (active, inside the grace window, not past its end date). */
export function licenseGrantsPro(l: LicenseState | null | undefined, now = Date.now()): boolean {
  if (!l || l.status !== 'active' || !l.key) return false;
  if (l.source === 'dev') return true;
  if (l.expiresAt !== null && now > l.expiresAt + LICENSE_OFFLINE_GRACE_MS) return false;
  return now - l.lastValidAt <= LICENSE_GRACE_MS;
}

/** Running on cached validation (server not confirmed in the last check interval). */
export function isInGrace(l: LicenseState, now = Date.now()): boolean {
  return licenseGrantsPro(l, now) && l.source !== 'dev' && now - l.lastValidAt > LICENSE_CHECK_INTERVAL_MS;
}

export function needsCheck(l: LicenseState, now = Date.now()): boolean {
  return !!l.key && l.source !== 'dev' && l.status !== 'none' && now - l.lastCheckedAt >= LICENSE_CHECK_INTERVAL_MS;
}

// ---- server answers ------------------------------------------------------------------------

export type Verdict =
  | { kind: 'valid'; expiresAt: number | null }
  | { kind: 'expired' | 'revoked' | 'invalid' | 'limit' }
  | { kind: 'unreachable' };

const parseDate = (v: unknown): number | null => {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

/**
 * Our endpoint (x2-speedup.vercel.app/api/validate-license). Its exact schema is not in this
 * repo, so we accept the shapes the extension has always accepted plus common status words.
 */
export function interpretX2(httpStatus: number, body: unknown): Verdict {
  if (httpStatus >= 500 || httpStatus === 0 || httpStatus === 404 || httpStatus === 405 || httpStatus === 429) return { kind: 'unreachable' };
  if (typeof body !== 'object' || body === null) return httpStatus >= 400 ? { kind: 'invalid' } : { kind: 'unreachable' };
  const b = body as Record<string, unknown>;
  const status = String(b.status ?? b.license_status ?? '').toLowerCase();
  if (b.valid === true || b.is_valid === true || status === 'valid' || status === 'active') {
    return { kind: 'valid', expiresAt: parseDate(b.expires_at ?? b.expiresAt) };
  }
  return statusVerdict(status, String(b.error ?? ''));
}

/** Lemon Squeezy public license API (POST /v1/licenses/validate). */
export function interpretLemonSqueezy(httpStatus: number, body: unknown): Verdict {
  if (httpStatus >= 500 || httpStatus === 0 || httpStatus === 429) return { kind: 'unreachable' };
  if (typeof body !== 'object' || body === null) return { kind: 'unreachable' };
  const b = body as { valid?: boolean; error?: string | null; license_key?: Record<string, unknown> | null };
  const lk = b.license_key ?? {};
  const status = String(lk.status ?? '').toLowerCase();
  if (b.valid === true && (status === '' || status === 'active' || status === 'inactive')) {
    const limit = Number(lk.activation_limit);
    const usage = Number(lk.activation_usage);
    if (Number.isFinite(limit) && limit > 0 && Number.isFinite(usage) && usage > limit) return { kind: 'limit' };
    return { kind: 'valid', expiresAt: parseDate(lk.expires_at) };
  }
  return statusVerdict(status, String(b.error ?? ''));
}

function statusVerdict(status: string, error: string): Verdict {
  if (status === 'expired' || /expired/i.test(error)) return { kind: 'expired' };
  if (['disabled', 'revoked', 'refunded', 'cancelled', 'canceled'].includes(status) || /disabled|revoked/i.test(error)) {
    return { kind: 'revoked' };
  }
  if (/activation limit|too many/i.test(error) || status === 'limit') return { kind: 'limit' };
  return { kind: 'invalid' };
}

/**
 * Combine both sources: valid if either says valid; otherwise the most specific explicit
 * answer; unreachable only if neither answered.
 */
export function combineVerdicts(x2: Verdict, ls: Verdict | null): Verdict {
  if (x2.kind === 'valid') return x2;
  if (ls?.kind === 'valid') return ls;
  const rank = ['expired', 'revoked', 'limit', 'invalid'] as const;
  for (const k of rank) if (x2.kind === k || ls?.kind === k) return { kind: k };
  return { kind: 'unreachable' };
}

/** New state after a validation attempt. Network errors keep the previous status. */
export function applyVerdict(prev: LicenseState, key: string, v: Verdict, source: LicenseState['source'], now = Date.now()): LicenseState {
  const base = { ...prev, key, lastCheckedAt: now };
  switch (v.kind) {
    case 'valid':
      return { ...base, status: 'active', lastValidAt: now, source, expiresAt: v.expiresAt };
    case 'unreachable':
      // Same key: keep the cached status (grace). New key: nothing verified, nothing stored.
      return prev.key === key && prev.status !== 'none' ? base : prev;
    default:
      return { ...base, status: v.kind, source };
  }
}
