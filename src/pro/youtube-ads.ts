// Pro · YouTube ads at 16x and muted, then restore (lazy-loaded ES module).
// Detection relies only on the player's `ad-showing` / `ad-interrupting` classes. If YouTube's
// markup changes and no player container is found, the module does nothing (logged in dev builds).
import type { Media } from '../content/media-registry';
import type { ProApi, ProModule } from '../content/pro-api';
import { t } from '../shared/i18n';

export const AD_SPEED = 16;
const PLAYER_SELECTOR = '.html5-video-player, #movie_player';

export function isAdShowing(player: Element): boolean {
  return player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
}

export function create(api: ProApi): ProModule {
  let enabled = false;
  const observers = new Map<Element, MutationObserver>();
  const saved = new WeakMap<Media, { muted: boolean }>();
  const inAd = new Set<Media>();

  function sync(player: Element): void {
    const ad = enabled && isAdShowing(player);
    for (const m of player.querySelectorAll('video')) {
      if (ad && !inAd.has(m)) {
        inAd.add(m);
        saved.set(m, { muted: m.muted });
        m.muted = true;
        api.setOverride(m, 'ads', AD_SPEED);
        api.flash(t('overlay_ad_fast'), m);
      } else if (!ad && inAd.has(m)) {
        restore(m);
      }
    }
  }

  function restore(m: Media): void {
    inAd.delete(m);
    api.setOverride(m, 'ads', null);
    const s = saved.get(m);
    if (s) m.muted = s.muted;
  }

  function watch(m: Media): void {
    const player = m.closest(PLAYER_SELECTOR);
    if (!player) {
      api.debug('youtube-ads: no player container around media; doing nothing');
      return;
    }
    if (!observers.has(player)) {
      const obs = new MutationObserver(() => sync(player));
      obs.observe(player, { attributes: true, attributeFilter: ['class'] });
      observers.set(player, obs);
    }
    sync(player);
  }

  api.onMediaAdded((m) => enabled && watch(m));

  return {
    update() {
      const s = api.settings();
      enabled = s.pro && s.youtubeAds;
      if (enabled) {
        api.media().forEach(watch);
        return;
      }
      [...inAd].forEach(restore);
      observers.forEach((o) => o.disconnect());
      observers.clear();
    },
    status() {
      return { enabled, inAd: inAd.size > 0, players: observers.size };
    }
  };
}
