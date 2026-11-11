// Popup ⇄ content-script protocol. Only frames that actually contain media answer, so the popup
// talks to the frame that holds the player (top frame or iframe alike).
import { planLimits } from '../config/plans';
import { isHostListed } from '../shared/hosts';
import { t } from '../shared/i18n';
import { normalizeMediaUrl } from '../shared/url';
import type { AbOp, AbRepeat } from './ab-repeat';
import type { MediaRegistry } from './media-registry';
import type { Overlay } from './overlay';
import { loadedProModule } from './pro-api';
import { quirksFor } from './quirks';
import type { RateController } from './rate-controller';
import type { PageContext, Rule } from '../shared/rules';
import type { ContentSettings } from './settings';
import type { StatsTracker } from './stats';

const FRAME_STEP_SECONDS = 1 / 30;

export interface MessageDeps {
  registry: MediaRegistry;
  controller: RateController;
  overlay: Overlay;
  settings(): ContentSettings;
  host: string;
  /** Null until the Pro rules module is loaded (free users never load it). */
  rules(): RulesLike | null;
  ab: AbRepeat;
  stats: StatsTracker;
}

type Request = { action?: string; [k: string]: unknown };

/** What the content script needs from the lazily loaded rules module. */
export interface RulesLike {
  initialSpeed(): number | null;
  schedule(force?: boolean): void;
  current(): Rule | null;
  context(): PageContext;
}

const proRequired = { success: false, isProRequired: true, error: 'Pro feature requires active trial or lifetime license' };

export function installMessageHandler(deps: MessageDeps): void {
  chrome.runtime.onMessage.addListener((request: Request, _sender, sendResponse) => {
    if (!request?.action || !deps.registry.count()) return false;
    const response = handle(request, deps);
    if (response === undefined) return false;
    if (response instanceof Promise) {
      response.then(sendResponse, () => sendResponse({ success: false }));
      return true; // async response
    }
    sendResponse(response);
    return false;
  });
}

function handle(req: Request, { registry, controller, overlay, settings, host, rules, ab, stats }: MessageDeps): unknown {
  const s = settings();
  const can = (f: keyof ReturnType<typeof planLimits>['features']) => planLimits(s.pro).features[f];
  const main = registry.primary();
  const flash = (label: string) => overlay.show(main instanceof HTMLVideoElement ? main : null, label);
  const noSeek = quirksFor(host).noDirectSeek;
  const seekBlocked = { success: false, error: 'seek-unsupported' };

  switch (req.action) {
    case 'SET_SPEED': {
      const speed = controller.setSpeed(Number(req.speed));
      return { success: true, currentSpeed: speed, speed };
    }
    case 'GET_SPEED':
      return { success: true, currentSpeed: controller.currentSpeed(), speed: controller.currentSpeed(), hasVideo: true };

    case 'GET_VIDEO_STATUS': {
      const base = {
        success: true,
        hasVideo: true,
        count: registry.count(),
        currentSpeed: controller.currentSpeed(),
        hostname: host,
        pageTitle: document.title,
        pageUrl: location.href,
        mediaKey: normalizeMediaUrl(location.href),
        shortcutsDisabled: isHostListed(host, s.shortcutBlacklist),
        sessionSaved: stats.sessionSaved,
        activeRule: rules()?.current() ?? null,
        abLoop: ab.state(main),
        ...(main ? controller.describe(main) : {})
      };
      const silence = loadedProModule('skip-silence');
      return silence ? silence.then((m) => ({ ...base, skipSilence: m?.status() ?? null })) : base;
    }

    case 'GET_PAGE_CONTEXT': {
      const r = rules();
      const ctx = r?.context() ?? { host, url: location.href, channel: null };
      return { success: true, ...ctx, mediaKey: normalizeMediaUrl(location.href), activeRule: r?.current() ?? null };
    }

    case 'AB_REPEAT': {
      if (!can('abRepeat')) return proRequired;
      if (!main) return { success: false, error: 'No video found' };
      if (noSeek) {
        flash(t('overlay_seek_unsupported'));
        return seekBlocked;
      }
      const label = ab.apply(main, (req.op as AbOp) ?? 'cycle');
      flash(label);
      return { success: true, label, abLoop: ab.state(main) };
    }

    case 'SKIP_TIME':
    case 'SEEK': {
      if (!can('skipTime')) return proRequired;
      const secs = Number(req.seconds) || 0;
      return { success: true, currentTime: controller.seek(secs) ?? 0 };
    }

    case 'STEP_FRAME': {
      if (!can('frameStep')) return proRequired;
      if (!main) return { success: false, error: 'No video found' };
      if (noSeek) {
        flash(t('overlay_seek_unsupported'));
        return seekBlocked;
      }
      main.pause();
      const dir = req.direction !== undefined ? (Number(req.direction) > 0 ? 1 : -1) : Number(req.delta) >= 0 ? 1 : -1;
      main.currentTime = Math.max(0, main.currentTime + dir * FRAME_STEP_SECONDS);
      flash(t(dir > 0 ? 'overlay_frame_next' : 'overlay_frame_prev'));
      return { success: true, currentTime: main.currentTime, isPlaying: false };
    }

    case 'ADD_CHECKPOINT':
    case 'GET_CURRENT_TIME': {
      if (req.action === 'ADD_CHECKPOINT' && !can('checkpoints')) return proRequired;
      if (!main) return { success: false, error: 'No video found' };
      if (req.action === 'ADD_CHECKPOINT') flash(`📍 ${formatTimestamp(main.currentTime)}`);
      return {
        success: true,
        timestamp: main.currentTime,
        currentTime: main.currentTime,
        duration: Number.isFinite(main.duration) ? main.duration : 0,
        pageTitle: document.title,
        pageUrl: location.href
      };
    }

    case 'SEEK_TO': {
      if (!can('checkpoints')) return proRequired;
      if (!main || typeof req.time !== 'number') return { success: false, error: 'No video found' };
      if (noSeek) {
        flash(t('overlay_seek_unsupported'));
        return seekBlocked;
      }
      main.currentTime = Math.max(0, req.time);
      flash(`📍 ${formatTimestamp(main.currentTime)}`);
      return { success: true, currentTime: main.currentTime };
    }

    case 'TOGGLE_PLAY': {
      if (!main) return { success: false };
      if (main.paused) main.play().catch(() => {});
      else main.pause();
      flash(main.paused ? '⏸' : '▶');
      return { success: true, isPlaying: !main.paused };
    }

    case 'TOGGLE_MUTE': {
      if (!main) return { success: false };
      main.muted = !main.muted;
      flash(main.muted ? '🔇' : '🔊');
      return { success: true, isMuted: main.muted };
    }

    default:
      return undefined;
  }
}

function formatTimestamp(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const t = Math.floor(sec);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(t % 60)}` : `${pad(m)}:${pad(t % 60)}`;
}
