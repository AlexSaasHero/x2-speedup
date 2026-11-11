// SpeedUp Video Pro — content script entry (runs at document_start in every frame).
import { formatSpeed } from '../config/plans';
import type { ShortcutAction } from '../shared/shortcuts';
import { debug } from './log';
import { MediaRegistry, isVideo, type Media } from './media-registry';
import { installMessageHandler } from './messages';
import { Overlay } from './overlay';
import { trackPointer } from './pointer';
import { RateController } from './rate-controller';
import { loadSettings, watchSettings, type ContentSettings } from './settings';
import { installShortcuts } from './shortcuts';
import { onSpaNavigation } from './spa';

const host = location.hostname;
let settings: ContentSettings | null = null;
const getSettings = (): ContentSettings => {
  if (!settings) throw new Error('settings not loaded');
  return settings;
};

const asVideo = (m: Media | null) => (isVideo(m) ? m : null);

const overlay = new Overlay({
  enabled: () => !!settings?.hudEnabled,
  autoHideMs: () => settings?.overlayAutoHideMs ?? 2000,
  speedText: (anchor) => formatSpeed(controller.speedOf(anchor)),
  position: () => settings?.overlayPositions[host] ?? null,
  savePosition: (p) => {
    if (!settings) return;
    chrome.storage.local.set({ overlayPositions: { ...settings.overlayPositions, [host]: p } }).catch(() => {});
  },
  step: (dir) => controller.step(dir)
});

const registry = new MediaRegistry(
  (m) => controller.attach(m),
  (m) => {
    controller.detach(m);
    overlay.forget(m);
  }
);

const controller = new RateController(
  registry,
  getSettings,
  {
    flash: (label, media) => overlay.show(asVideo(media), label),
    speedChanged: () => overlay.update()
  },
  host
);

// Synchronous, before any page script: intercept ratechange in the capture phase.
controller.installEarlyListeners();

function runShortcut(action: ShortcutAction): void {
  const s = getSettings();
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
  }
}

loadSettings()
  .then((loaded) => {
    settings = loaded;
    registry.start();
    controller.init();

    installShortcuts({ settings: getSettings, host, hasMedia: () => registry.count() > 0, run: runShortcut });
    installMessageHandler({ registry, controller, overlay, settings: getSettings, host });

    // Show the overlay while the pointer is over a video (auto-hides after the configured delay).
    trackPointer(() => {
      const v = registry.videoUnderPointer();
      if (v) overlay.show(v);
    });

    watchSettings((next, changed) => {
      settings = next;
      if (changed.has('hudEnabled') && !next.hudEnabled) overlay.hide();
      controller.refresh();
    });

    const rescan = () => {
      registry.rescan();
      controller.refresh();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rescan, { once: true });
    onSpaNavigation(rescan);
  })
  .catch((err) => debug('init failed', err));
