// Discovers <video>/<audio> elements in the document and in open shadow roots.
// Incremental: after the initial scan only added subtrees are inspected (no full-document rescans).
import { pointerInside } from './pointer';

export type Media = HTMLMediaElement;

export const isMedia = (n: unknown): n is Media => n instanceof HTMLMediaElement;
export const isVideo = (n: unknown): n is HTMLVideoElement => n instanceof HTMLVideoElement;

export class MediaRegistry {
  private readonly media = new Set<Media>();
  private readonly observedRoots = new WeakSet<Node>();
  private readonly observer: MutationObserver;
  private started = false;

  constructor(
    private readonly onAdd: (m: Media) => void,
    private readonly onRemove: (m: Media) => void
  ) {
    this.observer = new MutationObserver((records) => this.onMutations(records));
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.observe(document);
    this.rescan();
  }

  stop(): void {
    this.observer.disconnect();
    this.started = false;
  }

  /** Full scan (start, DOMContentLoaded, SPA navigation). */
  rescan(): void {
    this.scan(document);
    this.prune();
  }

  /** Register a media element found by other means (e.g. an event). */
  ensure(m: Media): void {
    if (this.media.has(m)) return;
    this.media.add(m);
    this.onAdd(m);
  }

  all(): Media[] {
    return [...this.media].filter((m) => m.isConnected);
  }

  videos(): HTMLVideoElement[] {
    return this.all().filter(isVideo);
  }

  count(): number {
    return this.all().length;
  }

  /**
   * The element a single-target action should act on:
   * under the pointer → playing (largest if several) → largest visible video → first with a source.
   */
  primary(): Media | null {
    const list = this.all();
    if (!list.length) return null;
    const hovered = list.find((m) => isVideo(m) && pointerInside(m));
    if (hovered) return hovered;
    const playing = list.filter((m) => !m.paused && !m.ended && m.readyState > 2);
    if (playing.length === 1) return playing[0];
    if (playing.length > 1) return largest(playing) ?? playing[0];
    return largest(list.filter(isVideo)) ?? list.find((m) => m.currentSrc || m.src) ?? list[0];
  }

  videoUnderPointer(): HTMLVideoElement | null {
    return this.videos().find((v) => pointerInside(v)) ?? null;
  }

  private observe(root: Document | ShadowRoot): void {
    if (this.observedRoots.has(root)) return;
    this.observedRoots.add(root);
    this.observer.observe(root, { childList: true, subtree: true });
  }

  private scan(root: Node): void {
    if (isMedia(root)) this.ensure(root);
    const parent = root as ParentNode;
    if (typeof parent.querySelectorAll === 'function') {
      parent.querySelectorAll('video, audio').forEach((m) => this.ensure(m as Media));
    }
    // Open shadow roots below `root` (closed ones are unreachable by design).
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let n: Node | null = walker.currentNode; n; n = walker.nextNode()) {
      const sr = (n as Element).shadowRoot;
      if (sr) {
        this.observe(sr);
        this.scan(sr);
      }
    }
  }

  private onMutations(records: MutationRecord[]): void {
    let removed = false;
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeType !== Node.ELEMENT_NODE) continue;
        if (isMedia(n)) this.ensure(n);
        if ((n as Element).firstElementChild || (n as Element).shadowRoot) this.scan(n);
      }
      if (r.removedNodes.length) removed = true;
    }
    if (removed && this.media.size) this.prune();
  }

  private prune(): void {
    for (const m of this.media) {
      if (!m.isConnected) {
        this.media.delete(m);
        this.onRemove(m);
      }
    }
  }
}

function largest<T extends Element>(list: T[]): T | null {
  let best: T | null = null;
  let bestArea = 0;
  for (const el of list) {
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea) {
      best = el;
      bestArea = area;
    }
  }
  return best;
}
