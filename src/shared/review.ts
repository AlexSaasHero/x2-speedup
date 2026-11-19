// "Leave a review" prompt in the popup (never over the video, never a notification).
// Shown to everyone the same way (no "do you like it?" gate, no reward), when:
// - at least 3 hours saved in total, and the extension installed for at least 5 days;
// - "Not now" hides it for 14 days, and after the second "Not now" it never comes back;
// - "Leave a review" hides it for good.
// State lives in chrome.storage.local (`reviewPrompt`), never synced, no network.
import type { ReviewPromptState } from './storage';

const DAY_MS = 24 * 60 * 60 * 1000;
export const REVIEW_THRESHOLD_SECONDS = 3 * 60 * 60;
export const REVIEW_MIN_INSTALL_AGE_MS = 5 * DAY_MS;
export const REVIEW_SNOOZE_MS = 14 * DAY_MS;
export const REVIEW_MAX_DISMISSALS = 2;

export function initialReviewPrompt(): ReviewPromptState {
  return { state: 'waiting', snoozedUntil: 0, dismissals: 0 };
}

export function shouldAskForReview(
  p: ReviewPromptState,
  totalSavedSeconds: number,
  installDate: number,
  now = Date.now()
): boolean {
  return (
    p.state === 'waiting' &&
    p.dismissals < REVIEW_MAX_DISMISSALS &&
    now >= p.snoozedUntil &&
    totalSavedSeconds >= REVIEW_THRESHOLD_SECONDS &&
    now - installDate >= REVIEW_MIN_INSTALL_AGE_MS
  );
}

/** "Not now": count the dismissal and wait 14 days (after the second one, never again). */
export function snoozeReview(p: ReviewPromptState, now = Date.now()): ReviewPromptState {
  return { state: 'waiting', snoozedUntil: now + REVIEW_SNOOZE_MS, dismissals: p.dismissals + 1 };
}

/** "Leave a review": never ask again. */
export function completeReview(p: ReviewPromptState): ReviewPromptState {
  return { ...p, state: 'done' };
}

/** Whole hours for the banner text ("You've saved 3 hours…"). */
export function savedHours(totalSavedSeconds: number): number {
  return Math.floor(totalSavedSeconds / 3600);
}
