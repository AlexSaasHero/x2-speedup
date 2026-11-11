// "Rate us" prompt: once the user has saved 30 minutes in total; "Not now" asks again in 14 days,
// "Rate" never asks again.
import type { ReviewPromptState } from './storage';

export const REVIEW_THRESHOLD_SECONDS = 30 * 60;
export const REVIEW_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export function shouldAskForReview(p: ReviewPromptState, totalSavedSeconds: number, now = Date.now()): boolean {
  return p.state === 'waiting' && totalSavedSeconds >= REVIEW_THRESHOLD_SECONDS && now >= p.snoozedUntil;
}

export function snoozeReview(now = Date.now()): ReviewPromptState {
  return { state: 'waiting', snoozedUntil: now + REVIEW_SNOOZE_MS };
}

export function completeReview(): ReviewPromptState {
  return { state: 'done', snoozedUntil: 0 };
}
