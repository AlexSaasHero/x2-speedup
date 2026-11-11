// Onboarding (opened on install) and "What's new" (opened on major/minor updates).
// Content scripts don't run on extension pages, so the demo player implements the default
// shortcuts locally with the same shortcut matcher, reading the user's real bindings.
import { formatSpeed, planLimits } from '../config/plans';
import { isPro } from '../shared/entitlement';
import { applyI18n, t } from '../shared/i18n';
import { LANDING_PAGE_URL } from '../shared/links';
import { hasSiteAccess, needsSiteAccessPrompt, requestSiteAccess } from '../shared/site-access';
import { roundSpeed, seekTarget } from '../shared/media-math';
import { migrate } from '../shared/migrations';
import { findShortcut, formatShortcut, type ShortcutAction } from '../shared/shortcuts';
import type { StoredState } from '../shared/storage';
import { CHANGELOG } from './changelog';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);
const DEMO_ACTIONS: ShortcutAction[] = ['slower', 'faster', 'reset', 'preferred', 'rewind', 'advance'];

/** 30 s of "speech" (tone bursts and pauses) as a WAV blob — no bundled media files. */
function demoAudioUrl(): string {
  const rate = 8000;
  const seconds = 30;
  const n = rate * seconds;
  const b = new Uint8Array(44 + n);
  const dv = new DataView(b.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  str(0, 'RIFF');
  dv.setUint32(4, 36 + n, true);
  str(8, 'WAVEfmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true);
  dv.setUint32(28, rate, true);
  dv.setUint16(32, 1, true);
  dv.setUint16(34, 8, true);
  str(36, 'data');
  dv.setUint32(40, n, true);
  for (let i = 0; i < n; i++) {
    const tt = i / rate;
    const on = tt % 2.5 < 1.6;
    b[44 + i] = 128 + (on ? Math.round(30 * Math.sin(2 * Math.PI * (220 + 40 * Math.sin(tt * 3)) * tt)) : 0);
  }
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

function mountDemo(state: StoredState) {
  const audio = new Audio(demoAudioUrl());
  audio.loop = true;
  audio.volume = 0.25;
  const canvas = $<HTMLCanvasElement>('wave');
  const ctx = canvas.getContext('2d')!;
  const speedEl = $('demoSpeed');
  const timeEl = $('demoTime');
  const feedback = $('demoFeedback');
  const pro = isPro(state);
  let fbTimer = 0;
  let before = 1;

  const say = (s: string) => {
    feedback.textContent = s;
    clearTimeout(fbTimer);
    fbTimer = window.setTimeout(() => (feedback.textContent = ''), 1200);
  };
  const setSpeed = (v: number) => {
    const { minSpeed, maxSpeed } = planLimits(pro);
    const next = Math.min(Math.max(roundSpeed(v), minSpeed), maxSpeed);
    audio.playbackRate = next;
    speedEl.textContent = formatSpeed(next);
    say(roundSpeed(v) > maxSpeed ? t('overlay_free_max', [formatSpeed(maxSpeed)]) : formatSpeed(next));
  };
  const run = (action: ShortcutAction) => {
    const r = audio.playbackRate;
    switch (action) {
      case 'slower': return setSpeed(r - state.speedStep);
      case 'faster': return setSpeed(r + state.speedStep);
      case 'reset':
        if (Math.abs(r - 1) > 0.01) {
          before = r;
          return setSpeed(1);
        }
        return setSpeed(before);
      case 'preferred': return setSpeed(Math.abs(r - state.favoriteSpeed) < 0.01 ? 1 : state.favoriteSpeed);
      case 'rewind':
      case 'advance': {
        const d = action === 'rewind' ? -state.seekSeconds : state.seekSeconds;
        audio.currentTime = seekTarget(audio.currentTime, d, audio.duration);
        return say(`${d > 0 ? '+' : '−'}${Math.abs(d)}s`);
      }
    }
  };

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    const sc = findShortcut(state.shortcuts, e);
    if (!sc || !DEMO_ACTIONS.includes(sc.action)) return;
    e.preventDefault();
    if (audio.paused) void audio.play();
    run(sc.action);
  });
  $('demoPlay').addEventListener('click', () => {
    if (audio.paused) void audio.play();
    else audio.pause();
  });
  audio.addEventListener('play', () => ($('demoPlay').textContent = t('onb_demo_pause')));
  audio.addEventListener('pause', () => ($('demoPlay').textContent = t('onb_demo_play')));

  const keys = $('demoKeys');
  for (const action of DEMO_ACTIONS) {
    const binding = state.shortcuts.find((s) => s.action === action);
    if (!binding) continue;
    const li = document.createElement('li');
    const kbd = document.createElement('kbd');
    kbd.textContent = formatShortcut(binding, IS_MAC);
    const label = document.createElement('span');
    label.textContent = t(`action_${action}`);
    li.append(kbd, label);
    keys.append(li);
  }

  // Simple animated waveform driven by the audio clock: faster playback = visibly faster scroll.
  const draw = () => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);
    const now = audio.currentTime;
    ctx.fillStyle = '#7c3aed';
    for (let x = 0; x < w; x += 6) {
      const tt = now + (x - w / 2) / 120;
      const on = ((tt % 2.5) + 2.5) % 2.5 < 1.6;
      const amp = on ? 18 + 30 * Math.abs(Math.sin(tt * 7) * Math.cos(tt * 2.3)) : 2;
      ctx.globalAlpha = x < w / 2 ? 1 : 0.35;
      ctx.fillRect(x, h / 2 - amp, 4, amp * 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(w / 2 - 1, 8, 2, h - 16);
    const s = Math.floor(now);
    timeEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

function mountTrial() {
  $('startTrial').addEventListener('click', () => chrome.tabs.create({ url: LANDING_PAGE_URL }));
  const msg = $('activateMsg');
  $('activate').addEventListener('click', async () => {
    const key = $<HTMLInputElement>('licenseKey').value.trim();
    if (!key) return;
    msg.className = 'msg';
    msg.textContent = t('license_validating');
    const res = await chrome.runtime.sendMessage({ action: 'LICENSE_ACTIVATE', key }).catch(() => null);
    const verdict: string = res?.verdict ?? 'unreachable';
    msg.className = `msg ${res?.ok ? 'ok' : 'err'}`;
    msg.textContent = t(`license_verdict_${verdict}`);
  });
}

function mountChangelog() {
  const root = $('changelog');
  for (const r of CHANGELOG) {
    const div = document.createElement('div');
    div.className = 'release';
    const h = document.createElement('h3');
    h.textContent = `v${r.version}`;
    const ul = document.createElement('ul');
    for (const key of r.items) {
      const li = document.createElement('li');
      li.textContent = t(key);
      ul.append(li);
    }
    div.append(h, ul);
    root.append(div);
  }
  if (location.hash === '#whats-new') $('whats-new').scrollIntoView();
}

async function mountSiteAccess() {
  if (!needsSiteAccessPrompt()) return;
  const section = $('siteAccess');
  const msg = $('siteAccessMsg');
  const render = (granted: boolean) => {
    section.hidden = false;
    msg.className = `msg ${granted ? 'ok' : ''}`;
    msg.textContent = granted ? t('site_access_granted') : '';
    $<HTMLButtonElement>('grantAccess').hidden = granted;
  };
  render(await hasSiteAccess());
  $('grantAccess').addEventListener('click', async () => render(await requestSiteAccess()));
}

async function init() {
  applyI18n();
  void mountSiteAccess();
  const state = migrate(await chrome.storage.local.get(null)).set as StoredState;
  mountDemo(state);
  mountTrial();
  mountChangelog();
  if (isPro(state)) $('trial').hidden = true;
}

void init();
