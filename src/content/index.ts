// SpeedUp Video Pro — content script entry (runs at document_start in every frame).
//
// Cost model: this script is injected into every frame of every page (ad iframes included), so
// it stays dormant until a <video>/<audio> actually appears: before that it only keeps a
// MutationObserver and one capture listener — no storage reads, no keyboard/pointer listeners.
// Pro-only page tools (speed rules + YouTube channel lookup) are lazy-loaded ES modules.
import { formatSpeed, planLimits, type Feature } from '../config/plans';
import { PRO_ACTIONS, type ShortcutAction } from '../shared/shortcuts';
import { t } from '../shared/i18n';
import { AbRepeat } from './ab-repeat';
import { debug } from './log';
import { MediaRegistry, isVideo, type Media } from './media-registry';
import type { RulesLike } from './messages';
import { installMessageHandler } from './messages';
import { Overlay } from './overlay';
import { trackPointer } from './pointer';
import { loadProModule, loadedProModule, type ProApi, type ProModuleName } from './pro-api';
import { RateController } from './rate-controller';
import { loadSettings, watchSettings, type ContentSettings } from './settings';
import { installShortcuts } from './shortcuts';
import { quirksFor } from './quirks';
import { onSpaNavigation } from './spa';
import { StatsTracker } from './stats';
import { isYouTubeHost } from './youtube';

const host = location.hostname;
let settings: ContentSettings | null = null;
const getSettings = (): ContentSettings => {
  if (!settings) throw new Error('settings not loaded');
  return settings;
};
const can = (f: Feature) => !!settings && planLimits(settings.pro).features[f];

const asVideo = (m: Media | null) => (isVideo(m) ? m : null);
const OVERRIDE_BADGE: Record<string, () => string> = {
  ads: () => ` · ${t('overlay_ad')}`,
  hold: () => ` · ${t('overlay_hold')}`,
  silence: () => ' ⏩'
};

const overlay = new Overlay({
  enabled: () => !!settings?.hudEnabled,
  autoHideMs: () => settings?.overlayAutoHideMs ?? 2000,
  speedText: (anchor) => {
    const o = controller.activeOverride(anchor);
    return formatSpeed(controller.speedOf(anchor)) + (o ? OVERRIDE_BADGE[o]() : '');
  },
  position: () => settings?.overlayPositions[host] ?? null,
  savePosition: (p) => {
    if (!settings) return;
    chrome.storage.local.set({ overlayPositions: { ...settings.overlayPositions, [host]: p } }).catch(() => {});
  },
  step: (dir) => controller.step(dir)
});

const mediaListeners = new Set<(m: Media) => void>();
const stats = new StatsTracker();
const ab = new AbRepeat();

const registry = new MediaRegistry(
  (m) => {
    controller.attach(m);
    stats.attach(m);
    mediaListeners.forEach((cb) => cb(m));
    // First media element in this frame: wake up.
    void boot();
  },
  (m) => {
    controller.detach(m);
    overlay.forget(m);
  }
);

const controller = new RateController(registry, getSettings, {
  flash: (label, media) => overlay.show(asVideo(media), label),
  speedChanged: () => overlay.update()
});

// Synchronous, before any page script: intercept ratechange in the capture phase.
controller.installEarlyListeners();

let rules: RulesLike | null = null;
let rulesLoading: Promise<RulesLike | null> | null = null;

/** Speed rules are Pro-only: load their module (rules + YouTube channel lookup) on demand. */
function ensureRules(): Promise<RulesLike | null> {
  if (rules || !can('rules')) return Promise.resolve(rules);
  rulesLoading ??= (import(/* runtime URL, not bundled */ chrome.runtime.getURL('pro/rules.js')) as Promise<typeof import('../pro/rules')>)
    .then((mod) => (rules = new mod.RuleApplier(getSettings, controller, registry, host)))
    .catch((err) => {
      debug('could not load rules', err);
      rulesLoading = null;
      return null;
    });
  return rulesLoading;
}

const proApi: ProApi = {
  host,
  settings: getSettings,
  media: () => registry.all(),
  onMediaAdded: (cb) => mediaListeners.add(cb),
  setOverride: (m, source, speed) => controller.setOverride(m, source, speed),
  flash: (label, m) => overlay.show(asVideo(m) ?? asVideo(registry.primary()), label),
  debug
};

/** Load Pro modules only when the user is Pro and turned the feature on. */
function syncProModules(): void {
  const s = getSettings();
  const wanted: [ProModuleName, boolean][] = [
    ['skip-silence', can('skipSilence') && s.skipSilence.enabled],
    ['youtube-ads', can('youtubeAds') && s.youtubeAds && isYouTubeHost(host)]
  ];
  for (const [name, on] of wanted) {
    if (on) loadProModule(name, proApi).then((m) => m?.update());
    else loadedProModule(name)?.then((m) => m?.update());
  }
}

function lockedFlash(feature: string): void {
  overlay.show(asVideo(registry.primary()), t('overlay_locked', [feature]));
}

function runShortcut(action: ShortcutAction): void {
  const s = getSettings();
  const needs = PRO_ACTIONS[action];
  if (needs && !can(needs)) return lockedFlash(t(`action_${action}`));
  switch (action) {
    case 'slower':
      controller.step(-1);
      break;
    case 'faster':
      controller.step(1);
      break;
    case 'reset':
      controller.toggleReset();
      break;
    case 'preferred':
      controller.togglePreferred();
      break;
    case 'rewind':
      controller.seek(-s.seekSeconds);
      break;
    case 'advance':
      controller.seek(s.seekSeconds);
      break;
    case 'toggleOverlay':
      overlay.toggleSession(asVideo(registry.primary()) ?? registry.videos()[0] ?? null);
      break;
    case 'abRepeat': {
      const m = registry.primary();
      if (m) overlay.show(asVideo(m), quirksFor(host).noDirectSeek ? t('overlay_seek_unsupported') : ab.apply(m, 'cycle'));
      break;
    }
    case 'hold':
      break; // handled by holdToSpeed()
  }
}

function holdToSpeed(active: boolean): void {
  if (active && !can('holdToSpeed')) return lockedFlash(t('action_hold'));
  const targets = controller.targets();
  for (const m of active ? targets : registry.all()) {
    controller.setOverride(m, 'hold', active ? getSettings().holdSpeed : null);
  }
  const anchor = asVideo(targets[0] ?? registry.primary());
  overlay.show(anchor, active ? `${formatSpeed(getSettings().holdSpeed)} · ${t('overlay_hold')}` : undefined);
}

let booting: Promise<void> | null = null;

function boot(): Promise<void> {
  booting ??= loadSettings()
    .then(async (loaded) => {
      settings = loaded;
      const r = await ensureRules();
      controller.init(r?.initialSpeed() ?? null);

      installShortcuts({ settings: getSettings, host, hasMedia: () => registry.count() > 0, run: runShortcut, hold: holdToSpeed });
      installMessageHandler({ registry, controller, overlay, settings: getSettings, host, rules: () => rules, ab, stats });

      // Show the overlay while the pointer is over a video (auto-hides after the configured delay).
      trackPointer(() => {
        const v = registry.videoUnderPointer();
        if (v) overlay.show(v);
      });

      watchSettings((next, changed) => {
        settings = next;
        if (changed.has('hudEnabled') && !next.hudEnabled) overlay.hide();
        controller.refresh();
        if (changed.has('rules') || changed.has('license')) void ensureRules().then((x) => x?.schedule(true));
        syncProModules();
      });

      const onNavigate = () => {
        registry.rescan();
        controller.refresh();
        rules?.schedule();
      };
      onSpaNavigation(onNavigate);
      // Channel info on YouTube appears after first render: look again shortly after load.
      rules?.schedule();
      syncProModules();
    })
    .catch((err) => debug('init failed', err));
  return booting;
}

// Synchronous at document_start: watch for media (cheap until one shows up).
registry.start();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => registry.rescan(), { once: true });
