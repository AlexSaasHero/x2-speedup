// Pro · Skip silence (lazy-loaded ES module).
//
// Listens to the media through Web Audio and speeds up while the audio stays below a threshold.
// Safety rules:
// - createMediaElementSource() can be called once per element → sources cached in a WeakMap.
// - It reroutes the element's audio through our AudioContext: if that context is not running the
//   page would go silent, so we only connect once the context is confirmed running.
// - Cross-origin media without CORS yields all-zero samples AND silences the element. We never
//   connect such media (origin check up front) and, if zeros still show up, stop and say so
//   instead of speeding everything up.
// - The source is always wired straight to the speakers as well, so audio is untouched; when the
//   feature is off the graph is a plain pass-through.
import type { Media } from '../content/media-registry';
import type { ProApi, ProModule } from '../content/pro-api';

const SAMPLE_MS = 50;
/** Unmuted playback with perfectly zero samples for this long ⇒ tainted (cross-origin) audio. */
const TAINT_MS = 5000;

interface Track {
  analyser: AnalyserNode;
  buf: Float32Array;
  fast: boolean;
  silentSince: number | null;
  speechSince: number;
  zeroSince: number | null;
  heardSound: boolean;
}

export function isSafeSource(src: string, pageOrigin: string, crossOrigin: string | null): boolean {
  if (!src) return false;
  if (/^(blob|data|mediastream):/i.test(src)) return true;
  try {
    if (new URL(src, pageOrigin).origin === pageOrigin) return true;
  } catch {
    return false;
  }
  // A CORS-mode request: if the server refused it the media would not have loaded at all.
  return crossOrigin !== null;
}

export function create(api: ProApi): ProModule {
  let ctx: AudioContext | null = null;
  let enabled = false;
  let timer = 0;
  const tracks = new WeakMap<Media, Track>();
  const live = new Set<Media>();
  const unavailable = new WeakSet<Media>();
  const wired = new WeakSet<Media>();
  let unavailableCount = 0;
  const cfg = () => api.settings().skipSilence;

  function markUnavailable(m: Media, why: string): void {
    if (unavailable.has(m)) return;
    unavailable.add(m);
    unavailableCount++;
    api.debug('skip-silence unavailable:', why);
    api.flash('Skip silence unavailable on this player', m);
  }

  async function runningContext(): Promise<AudioContext | null> {
    try {
      ctx ??= new AudioContext();
      if (ctx.state !== 'running') await ctx.resume();
    } catch (err) {
      api.debug('AudioContext error', err);
    }
    return ctx?.state === 'running' ? ctx : null;
  }

  async function connect(m: Media): Promise<void> {
    if (!enabled || tracks.has(m) || unavailable.has(m) || !m.currentSrc) return;
    if (!isSafeSource(m.currentSrc, location.origin, m.crossOrigin)) {
      markUnavailable(m, `cross-origin source without CORS: ${m.currentSrc}`);
      return;
    }
    const c = await runningContext();
    if (!c || tracks.has(m)) return; // not allowed to start audio yet: retried on the next play
    try {
      const source = c.createMediaElementSource(m);
      const analyser = c.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(c.destination);
      source.connect(analyser);
      tracks.set(m, {
        analyser,
        buf: new Float32Array(analyser.fftSize),
        fast: false,
        silentSince: null,
        speechSince: 0,
        zeroSince: null,
        heardSound: false
      });
      live.add(m);
      start();
    } catch (err) {
      // e.g. the page already routes this element through its own Web Audio graph.
      markUnavailable(m, String(err));
    }
  }

  function setFast(m: Media, t: Track, on: boolean, now: number): void {
    if (t.fast === on) return;
    t.fast = on;
    if (!on) t.speechSince = now;
    api.setOverride(m, 'silence', on ? cfg().silenceSpeed : null);
  }

  function tick(): void {
    const now = performance.now();
    const c = cfg();
    let playing = 0;
    for (const m of live) {
      const t = tracks.get(m)!;
      if (!m.isConnected) {
        setFast(m, t, false, now);
        live.delete(m);
        continue;
      }
      if (!enabled || m.paused || m.ended || m.seeking) {
        t.silentSince = null;
        setFast(m, t, false, now);
        continue;
      }
      playing++;
      // Muted output is indistinguishable from silence: never accelerate blindly.
      if (m.muted || m.volume === 0) {
        t.silentSince = null;
        setFast(m, t, false, now);
        continue;
      }
      t.analyser.getFloatTimeDomainData(t.buf as Float32Array<ArrayBuffer>);
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < t.buf.length; i++) {
        const v = t.buf[i];
        sum += v * v;
        if (v > peak) peak = v;
        else if (-v > peak) peak = -v;
      }
      if (peak === 0 && !t.heardSound) {
        t.zeroSince ??= now;
        if (now - t.zeroSince > TAINT_MS) {
          setFast(m, t, false, now);
          live.delete(m);
          markUnavailable(m, 'all-zero samples');
          continue;
        }
      } else if (peak > 0) {
        t.heardSound = true;
        t.zeroSince = null;
      }
      const rms = Math.sqrt(sum / t.buf.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
      if (db < c.thresholdDb) {
        t.silentSince ??= now;
        if (!t.fast && now - t.silentSince >= c.minSilenceMs && now - t.speechSince >= c.minSpeechMs) setFast(m, t, true, now);
      } else {
        t.silentSince = null;
        setFast(m, t, false, now);
      }
    }
    if (!playing) stop();
  }

  function start(): void {
    if (!timer && enabled && live.size) timer = window.setInterval(tick, SAMPLE_MS);
  }

  function stop(): void {
    clearInterval(timer);
    timer = 0;
  }

  function wire(m: Media): void {
    if (wired.has(m)) return;
    wired.add(m);
    const onPlay = () => {
      if (!enabled) return;
      if (tracks.has(m)) start();
      else void connect(m);
    };
    m.addEventListener('play', onPlay);
    m.addEventListener('playing', onPlay);
    m.addEventListener('loadedmetadata', () => !m.paused && onPlay());
    m.addEventListener('emptied', () => {
      const t = tracks.get(m);
      if (t) {
        t.heardSound = false;
        t.zeroSince = null;
      }
    });
  }

  api.onMediaAdded((m) => {
    wire(m);
    if (enabled && !m.paused) void connect(m);
  });

  return {
    update() {
      const s = api.settings();
      enabled = s.pro && s.skipSilence.enabled;
      const now = performance.now();
      for (const m of api.media()) {
        wire(m);
        if (enabled && !m.paused) void connect(m);
      }
      if (enabled) start();
      else {
        stop();
        for (const m of live) setFast(m, tracks.get(m)!, false, now);
      }
    },
    status() {
      let fast = false;
      for (const m of live) if (tracks.get(m)?.fast) fast = true;
      return { enabled, listening: live.size, unavailable: unavailableCount, fast };
    }
  };
}
