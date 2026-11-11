// A-B repeat for the active media element.
import type { Media } from './media-registry';

interface Loop {
  a: number;
  b?: number;
}

export type AbOp = 'a' | 'b' | 'clear' | 'cycle';

export class AbRepeat {
  private readonly loops = new WeakMap<Media, Loop>();
  private readonly wired = new WeakSet<Media>();

  /** Returns a short label describing the new state. */
  apply(m: Media, op: AbOp): string {
    const loop = this.loops.get(m);
    const t = m.currentTime;
    const resolved: Exclude<AbOp, 'cycle'> = op === 'cycle' ? (!loop ? 'a' : loop.b === undefined ? 'b' : 'clear') : op;
    if (resolved === 'clear') {
      this.loops.delete(m);
      return 'A-B off';
    }
    if (resolved === 'a') {
      this.loops.set(m, { a: t, b: loop?.b !== undefined && loop.b > t ? loop.b : undefined });
      this.wire(m);
      return `A ${fmt(t)}`;
    }
    const a = loop?.a ?? 0;
    if (t <= a + 0.2) return `B must be after A (${fmt(a)})`;
    this.loops.set(m, { a, b: t });
    this.wire(m);
    m.currentTime = a;
    return `A-B ${fmt(a)}–${fmt(t)}`;
  }

  state(m: Media | null): Loop | null {
    return (m && this.loops.get(m)) ?? null;
  }

  private wire(m: Media): void {
    if (this.wired.has(m)) return;
    this.wired.add(m);
    m.addEventListener('timeupdate', () => {
      const loop = this.loops.get(m);
      if (loop?.b !== undefined && m.currentTime >= loop.b) m.currentTime = loop.a;
    });
    // A different video in the same element (playlist, SPA) drops the loop.
    m.addEventListener('emptied', () => this.loops.delete(m));
  }
}

function fmt(sec: number): string {
  const t = Math.max(0, Math.floor(sec));
  const m = Math.floor(t / 60);
  return `${m}:${String(t % 60).padStart(2, '0')}`;
}
