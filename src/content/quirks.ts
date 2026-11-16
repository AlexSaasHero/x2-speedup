// Per-site behaviour differences. Keep this list short and documented in docs/QA.md.
import { isHostListed } from '../shared/hosts';

export type LecturePlatform = 'panopto' | 'echo360';

/**
 * Lecture-capture platforms, by domain (subdomains included). The single place to add new ones
 * (Kaltura, YuJa, …). Matched against the host of the frame the content script runs in, so a
 * player embedded in an <iframe> inside Canvas/Moodle is recognised too.
 */
export const LECTURE_PLATFORMS: Readonly<Record<LecturePlatform, readonly string[]>> = {
  panopto: ['panopto.com', 'panopto.eu'],
  echo360: ['echo360.org', 'echo360.org.uk', 'echo360.org.au', 'echo360.ca', 'echo360.net.au', 'echo360.com']
};

export interface SiteQuirks {
  /** Lecture platform of this frame, if any. */
  platform: LecturePlatform | null;
  /**
   * Writing media.currentTime directly breaks the player (Netflix shows error M7375 and stops).
   * Seek, frame step, A-B repeat and bookmark jumps are disabled there with a message.
   */
  noDirectSeek: boolean;
  /**
   * The player plays several synced streams (presenter + screen) and uses one of them as the
   * clock: the speed must go to every media element of the frame, whatever `applyToAll` says,
   * or the lecture keeps advancing at 1x (QA 2026-11-14, BUGS #22).
   */
  allStreams: boolean;
  /**
   * The extension is the source of truth for the speed. These players write their own speed back
   * at many moments (Play button, opening a lecture, seek, click, buffering, next lecture; Echo360
   * about once a second while playing: BUGS #23, #24). Any rate change not made by the extension
   * is a player reset and is undone, including the player's own speed menu.
   */
  extensionOwnsRate: boolean;
  /**
   * Keep the speed badge out of the way: lecture players put the title where the badge sits. It is
   * not shown on hover and hides after at most 2 s; it reappears when the speed changes.
   */
  quietOverlay: boolean;
  /**
   * Skip silence (Pro, Beta) stays off: Web Audio on these players' cross-origin/HLS media is not
   * verified yet (CORS), and a failed hookup can mute the lecture. Hidden in the popup too.
   */
  noSkipSilence: boolean;
  /**
   * Default corner of the speed badge. Panopto's viewer has its logo and title in the top-left of the
   * video (QA 2026-11-16): the badge goes top-right there.
   */
  overlayCorner: 'top-left' | 'top-right';
}

export function lecturePlatform(host: string): LecturePlatform | null {
  for (const [platform, domains] of Object.entries(LECTURE_PLATFORMS) as [LecturePlatform, readonly string[]][]) {
    if (isHostListed(host, domains)) return platform;
  }
  return null;
}

export function quirksFor(host: string): SiteQuirks {
  const h = host.toLowerCase();
  const platform = lecturePlatform(h);
  return {
    platform,
    noDirectSeek: /(^|\.)netflix\.com$/.test(h),
    allStreams: platform !== null,
    extensionOwnsRate: platform !== null,
    quietOverlay: platform !== null,
    noSkipSilence: platform !== null,
    overlayCorner: platform === 'panopto' ? 'top-right' : 'top-left'
  };
}
