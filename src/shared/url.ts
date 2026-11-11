// URL normalisation for bookmarks and URL rules.

/** Query parameters that never identify the media (tracking, timestamps, UI state). */
const DROP_PARAMS = new Set([
  't', 'start', 'time_continue', 'si', 'feature', 'pp', 'ab_channel', 'fbclid', 'gclid', 'dclid', 'msclkid',
  'igshid', 'mc_cid', 'mc_eid', 'ref', 'ref_src', 'spm', 'yclid', '_hsenc', '_hsmi', 'index'
]);

const isYouTube = (host: string) => /(^|\.)youtube\.com$/.test(host) || host === 'youtu.be';

/**
 * Stable key for "the same video": no protocol, no www./m., no hash, no tracking/timestamp params,
 * sorted remaining params. YouTube watch/shorts/youtu.be collapse to the video id.
 */
export function normalizeMediaUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw.split('#')[0];
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
  if (isYouTube(host)) {
    const id =
      host === 'youtu.be' ? u.pathname.slice(1).split('/')[0] : u.pathname === '/watch' ? u.searchParams.get('v') : null;
    if (id) return `youtube.com/watch?v=${id}`;
    const shorts = /^\/shorts\/([^/?#]+)/.exec(u.pathname);
    if (shorts) return `youtube.com/shorts/${shorts[1]}`;
  }
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !DROP_PARAMS.has(k.toLowerCase()) && !k.toLowerCase().startsWith('utm_'))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : '';
  const path = u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, '');
  return `${host}${u.port ? `:${u.port}` : ''}${path}${query}`;
}
