// Domain list helpers (shortcut blacklist, later per-domain rules).

/** "https://www.Example.com/path" → "example.com"; "*.example.com" → "example.com". */
export function normalizeHostPattern(pattern: string): string {
  let p = pattern.trim().toLowerCase();
  p = p.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  p = p.split(/[/?#]/)[0];
  p = p.replace(/:\d+$/, '');
  p = p.replace(/^\*\./, '').replace(/^www\./, '');
  return p;
}

/** True when host equals the pattern or is a subdomain of it. */
export function hostMatches(host: string, pattern: string): boolean {
  const h = normalizeHostPattern(host);
  const p = normalizeHostPattern(pattern);
  return !!p && !!h && (h === p || h.endsWith(`.${p}`));
}

export function isHostListed(host: string, list: readonly string[]): boolean {
  return list.some((p) => hostMatches(host, p));
}

/** Parse a textarea (one domain per line, commas allowed) into a clean, de-duplicated list. */
export function parseHostList(text: string): string[] {
  const out = new Set<string>();
  for (const part of text.split(/[\n,]+/)) {
    const p = normalizeHostPattern(part);
    if (p) out.add(p);
  }
  return [...out];
}
