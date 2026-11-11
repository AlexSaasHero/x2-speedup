// License validation in the service worker. Stateless: everything lives in storage.local.license.
import {
  LS_VALIDATE_URL,
  X2_VALIDATE_URL,
  applyVerdict,
  combineVerdicts,
  interpretLemonSqueezy,
  interpretX2,
  needsCheck,
  noLicense,
  validateLicense,
  type LicenseState,
  type Verdict
} from '../shared/license';

export const LICENSE_ALARM = 'license-check';
const TIMEOUT_MS = 6000;

async function post(url: string, body: BodyInit, contentType: string): Promise<{ status: number; json: unknown }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType, Accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON body */
    }
    return { status: res.status, json };
  } catch {
    return { status: 0, json: null };
  }
}

/** Ask our endpoint first; Lemon Squeezy is consulted when ours does not confirm the key. */
export async function verify(key: string): Promise<{ verdict: Verdict; source: LicenseState['source'] }> {
  const x2 = await post(X2_VALIDATE_URL, JSON.stringify({ license_key: key }), 'application/json');
  const x2Verdict = interpretX2(x2.status, x2.json);
  if (x2Verdict.kind === 'valid') return { verdict: x2Verdict, source: 'x2' };
  const ls = await post(LS_VALIDATE_URL, new URLSearchParams({ license_key: key }).toString(), 'application/x-www-form-urlencoded');
  const lsVerdict = interpretLemonSqueezy(ls.status, ls.json);
  const verdict = combineVerdicts(x2Verdict, lsVerdict);
  return { verdict, source: lsVerdict.kind === 'valid' || x2Verdict.kind === 'unreachable' ? 'lemonsqueezy' : 'x2' };
}

export async function readLicense(): Promise<LicenseState> {
  return validateLicense((await chrome.storage.local.get('license')).license);
}

async function writeLicense(l: LicenseState): Promise<void> {
  await chrome.storage.local.set({ license: l });
}

export interface ActivationResult {
  ok: boolean;
  verdict: Verdict['kind'];
  license: LicenseState;
}

export async function activate(rawKey: string): Promise<ActivationResult> {
  const key = rawKey.trim();
  const prev = await readLicense();
  if (__DEV_MASTER_KEY__ && key === __DEV_MASTER_KEY__) {
    const l: LicenseState = { ...noLicense(), key, status: 'active', source: 'dev', lastValidAt: Date.now(), lastCheckedAt: Date.now() };
    await writeLicense(l);
    return { ok: true, verdict: 'valid', license: l };
  }
  const { verdict, source } = await verify(key);
  const next = applyVerdict(prev, key, verdict, source);
  await writeLicense(next);
  return { ok: verdict.kind === 'valid', verdict: verdict.kind, license: next };
}

export async function deactivate(): Promise<void> {
  await writeLicense(noLicense());
}

/** Called on startup and by the hourly alarm; talks to the network at most once a day. */
export async function checkIfDue(force = false): Promise<void> {
  const l = await readLicense();
  if (!l.key || (!force && !needsCheck(l))) return;
  const { verdict, source } = await verify(l.key);
  // Re-read: the user may have changed the key while we were waiting on the network.
  const current = await readLicense();
  if (current.key !== l.key) return;
  await writeLicense(applyVerdict(current, l.key, verdict, source));
}

export function scheduleLicenseChecks(): void {
  chrome.alarms.get(LICENSE_ALARM).then((a) => {
    if (!a) chrome.alarms.create(LICENSE_ALARM, { periodInMinutes: 60, delayInMinutes: 1 });
  });
}
