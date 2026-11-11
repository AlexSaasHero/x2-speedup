// Per-site behaviour differences. Keep this list short and documented in docs/QA.md.

export interface SiteQuirks {
  /**
   * Writing media.currentTime directly breaks the player (Netflix shows error M7375 and stops).
   * Seek, frame step, A-B repeat and bookmark jumps are disabled there with a message.
   */
  noDirectSeek: boolean;
}

export function quirksFor(host: string): SiteQuirks {
  const h = host.toLowerCase();
  return {
    noDirectSeek: /(^|\.)netflix\.com$/.test(h)
  };
}
