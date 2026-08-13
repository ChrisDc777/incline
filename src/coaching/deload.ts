import { COACHING_RULE_VERSION, type CoachingInsight } from './types';
import type { WeeklyVolume } from '@/db/types';

export const DELOAD_SNOOZE_KEY = 'coaching.deload.snoozeUntil';
export const DELOAD_APPLIED_KEY = 'coaching.deload.lastAppliedAt';

const MIN_STREAK_WEEKS = 4;
const VOLUME_SCALE = 0.6;
const ALREADY_DELOADED_RATIO = 0.7;
const SNOOZE_MS = 14 * 86_400_000;
const COOLDOWN_MS = 21 * 86_400_000;

export interface DeloadSuggestion {
  weeksTrained: number;
  volumeScale: number;
  reasonText: string;
}

export function scaleDeloadSets(targetSets: number): number {
  return Math.max(1, Math.ceil(targetSets * VOLUME_SCALE));
}

export function deloadSnoozeUntil(now = Date.now()): number {
  return now + SNOOZE_MS;
}

/**
 * Suggest a deload after 4+ consecutive training weeks.
 * Skips if last week already looks like a cut, or the user snoozed / just applied one.
 */
export function detectDeload(input: {
  weeklyStreak: number;
  weeklyVolumes: WeeklyVolume[];
  lastAppliedAt?: number | null;
  snoozeUntil?: number | null;
  now?: number;
}): DeloadSuggestion | null {
  const now = input.now ?? Date.now();
  if (input.weeklyStreak < MIN_STREAK_WEEKS) return null;
  if (input.snoozeUntil != null && input.snoozeUntil > now) return null;
  if (input.lastAppliedAt != null && now - input.lastAppliedAt < COOLDOWN_MS) return null;

  const weeks = input.weeklyVolumes.filter((w) => w.sessions > 0);
  if (weeks.length >= 2) {
    const last = weeks[weeks.length - 1];
    const prior = weeks.slice(Math.max(0, weeks.length - 4), -1);
    const priorAvg =
      prior.length > 0 ? prior.reduce((sum, w) => sum + w.volume, 0) / prior.length : 0;
    if (priorAvg > 0 && last.volume <= priorAvg * ALREADY_DELOADED_RATIO) return null;
  }

  return {
    weeksTrained: input.weeklyStreak,
    volumeScale: VOLUME_SCALE,
    reasonText: `${input.weeklyStreak} weeks hard — cut sets to ~${Math.round(VOLUME_SCALE * 100)}% for a week. Your main routine stays unchanged until you confirm.`,
  };
}

export function deloadInsight(suggestion: DeloadSuggestion, href = '/(app)/deload'): CoachingInsight {
  return {
    id: 'deload-week',
    kind: 'deload',
    severity: 'warning',
    title: 'Deload week?',
    body: suggestion.reasonText,
    href,
    ruleVersion: COACHING_RULE_VERSION,
  };
}
