import { startOfWeek } from '@/db/calc';

export type CelebrationKind = 'meaningful' | 'normal';

/** Contextual one-liner for the finish celebration (no springy checkmark hero). */
export function finishCelebrationMessage(input: {
  prCount: number;
  weekSessions: number;
}): string {
  if (input.prCount > 0) {
    return input.prCount === 1
      ? "New PR! You're getting stronger."
      : `New PRs! ${input.prCount} records this session.`;
  }
  if (input.weekSessions >= 5) {
    return `Consistency pays off — ${input.weekSessions} workouts this week!`;
  }
  if (input.weekSessions >= 3) {
    return 'Solid week — keep the streak going.';
  }
  return 'Great session! You crushed it today.';
}

/** Full confetti/Lottie for PRs or solid weekly consistency; message-only otherwise. */
export function celebrationKind(input: {
  prCount: number;
  weekSessions: number;
}): CelebrationKind {
  if (input.prCount > 0) return 'meaningful';
  if (input.weekSessions >= 3) return 'meaningful';
  return 'normal';
}

export function currentWeekBounds(now = Date.now()): { startMs: number; endMs: number } {
  const startMs = startOfWeek(now);
  return { startMs, endMs: startMs + 7 * 86_400_000 };
}
