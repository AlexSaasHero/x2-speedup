// Contract between the content script and lazily loaded Pro modules (src/pro/*).
// Pro modules are separate ES module bundles; they only see this API (types are erased).
import { debug } from './log';
import type { Media } from './media-registry';
import type { OverrideSource } from './rate-controller';
import type { ContentSettings } from './settings';

export interface ProApi {
  host: string;
  settings(): ContentSettings;
  media(): Media[];
  onMediaAdded(cb: (m: Media) => void): void;
  setOverride(m: Media, source: OverrideSource, speed: number | null): void;
  flash(label: string, m: Media | null): void;
  debug(...args: unknown[]): void;
}

export interface ProModule {
  /** Settings changed (or first load): enable/disable accordingly. */
  update(): void;
  /** Small JSON-able status for the popup. */
  status(): Record<string, unknown>;
}

export type ProModuleName = 'skip-silence' | 'youtube-ads';

const loaded = new Map<ProModuleName, Promise<ProModule | null>>();

export function loadProModule(name: ProModuleName, api: ProApi): Promise<ProModule | null> {
  let p = loaded.get(name);
  if (!p) {
    const url = chrome.runtime.getURL(`pro/${name}.js`);
    p = (import(/* runtime URL, not bundled */ url) as Promise<{ create(api: ProApi): ProModule }>)
      .then((mod) => {
        const m = mod.create(api);
        m.update();
        return m;
      })
      .catch((err) => {
        debug(`could not load ${name}`, err);
        return null;
      });
    loaded.set(name, p);
  }
  return p;
}

export function loadedProModule(name: ProModuleName): Promise<ProModule | null> | undefined {
  return loaded.get(name);
}
