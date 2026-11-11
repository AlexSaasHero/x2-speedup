// Extension version helpers.

export function parseVersion(v: string | undefined | null): number[] {
  return String(v ?? '')
    .split('.')
    .map((p) => parseInt(p, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}

/** Show "What's new" only when the major or minor number changes (not for patch updates). */
export function isFeatureUpdate(previous: string | undefined, current: string): boolean {
  if (!previous) return false;
  const [pMaj = 0, pMin = 0] = parseVersion(previous);
  const [cMaj = 0, cMin = 0] = parseVersion(current);
  return cMaj > pMaj || (cMaj === pMaj && cMin > pMin);
}
