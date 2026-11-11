// YouTube page helpers. Every lookup has fallbacks and returns null rather than guessing:
// a missed channel only means "no channel rule", never a wrong speed.
import type { ChannelInfo } from '../shared/rules';

export function isYouTubeHost(host: string): boolean {
  return /(^|\.)youtube\.com$/.test(host) || /(^|\.)youtube-nocookie\.com$/.test(host);
}

/** Owner link of the current video, newest layouts first. */
const OWNER_LINK_SELECTORS = [
  'ytd-watch-metadata ytd-channel-name a[href]',
  'ytd-watch-metadata #owner a[href^="/@"], ytd-watch-metadata #owner a[href^="/channel/"]',
  'ytd-video-owner-renderer ytd-channel-name a[href]',
  '#upload-info ytd-channel-name a[href]',
  'ytd-reel-video-renderer[is-active] ytd-channel-name a[href]',
  'ytm-slim-owner-renderer a[href]'
];

function fromHref(href: string | null): Pick<ChannelInfo, 'id' | 'handle'> {
  if (!href) return {};
  let path = href;
  try {
    path = new URL(href, 'https://www.youtube.com').pathname;
  } catch {
    /* keep raw */
  }
  const handle = /^\/(@[^/?#]+)/.exec(path);
  if (handle) return { handle: decodeURIComponent(handle[1]) };
  const id = /^\/channel\/(UC[\w-]{10,})/.exec(path);
  if (id) return { id: id[1] };
  return {};
}

const clean = (o: ChannelInfo): ChannelInfo | null => {
  const out: ChannelInfo = {};
  if (o.id) out.id = o.id;
  if (o.handle) out.handle = o.handle;
  if (o.name) out.name = o.name.trim();
  return out.id || out.handle || out.name ? out : null;
};

export function extractChannel(doc: Document, url: string): ChannelInfo | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!isYouTubeHost(u.hostname)) return null;

  // Channel pages: the URL itself identifies the channel.
  const fromPath = fromHref(u.pathname);
  if (fromPath.handle || fromPath.id) {
    const name = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? undefined;
    return clean({ ...fromPath, name });
  }

  for (const sel of OWNER_LINK_SELECTORS) {
    const a = doc.querySelector<HTMLAnchorElement>(sel);
    if (!a) continue;
    const info = clean({ ...fromHref(a.getAttribute('href')), name: a.textContent ?? undefined });
    if (info) return info;
  }

  // Microdata: correct on full page loads but can be stale after SPA navigation,
  // so only trust it when it describes the video in the URL.
  const v = u.searchParams.get('v');
  const metaVideo = doc.querySelector('meta[itemprop="identifier"], meta[itemprop="videoId"]')?.getAttribute('content');
  if (v && metaVideo && metaVideo !== v) return null;
  const author = doc.querySelector('[itemprop="author"]');
  return clean({
    id: doc.querySelector('meta[itemprop="channelId"]')?.getAttribute('content') ?? undefined,
    ...fromHref(author?.querySelector('link[itemprop="url"]')?.getAttribute('href') ?? null),
    name: author?.querySelector('link[itemprop="name"]')?.getAttribute('content') ?? undefined
  });
}
