import type { MuscleDistribution, ProgressStats, Unit } from '@/db/types';
import { formatVolume } from '@/db/calc';
import { COACHING_RULE_VERSION, type CoachingInsight } from './types';

const RECOVERY_GAP_DAYS = 8;
const IMBALANCE_RATIO = 1.4;

function topMuscleGap(muscles: MuscleDistribution[]): { high: string; low: string } | null {
  if (muscles.length < 2) return null;
  const sorted = [...muscles].sort((a, b) => b.sets - a.sets);
  const high = sorted[0];
  const low = sorted[sorted.length - 1];
  if (high.sets <= 0 || low.sets <= 0) return null;
  if (high.sets / low.sets < IMBALANCE_RATIO) return null;
  return { high: high.muscle, low: low.muscle };
}

/** Pick the single best coaching insight for Home from existing aggregates. */
export function pickHomeCoachingInsight(
  stats: ProgressStats | null | undefined,
  unit: Unit,
  muscleExposureDays: Record<string, number> | null,
  now = Date.now(),
): CoachingInsight | null {
  if (!stats || stats.totalSessions < 3) return null;

  const weeks = stats.weeklyVolume ?? [];
  const thisWeek = weeks[weeks.length - 1];
  const prevWeek = weeks.length > 1 ? weeks[weeks.length - 2] : null;

  if (prevWeek && prevWeek.volume > 0 && thisWeek) {
    const delta = Math.round(((thisWeek.volume - prevWeek.volume) / prevWeek.volume) * 100);
    if (Math.abs(delta) >= 10) {
      return {
        id: 'volume-trend',
        kind: 'volume_trend',
        severity: delta >= 0 ? 'success' : 'warning',
        title: delta >= 0 ? 'Volume is climbing' : 'Volume dipped',
        body: `${delta >= 0 ? '+' : ''}${delta}% vs last week (${formatVolume(thisWeek.volume, unit)})`,
        href: '/(app)/(tabs)/progress',
        ruleVersion: COACHING_RULE_VERSION,
      };
    }
  }

  if (muscleExposureDays) {
    for (const [muscle, days] of Object.entries(muscleExposureDays)) {
      if (days >= RECOVERY_GAP_DAYS) {
        return {
          id: `recovery-${muscle}`,
          kind: 'recovery_gap',
          severity: 'info',
          title: 'Recovery gap',
          body: `${muscle.replace('_', ' ')} hasn't been trained in ${days} days`,
          href: '/(app)/muscle-distribution',
          ruleVersion: COACHING_RULE_VERSION,
        };
      }
    }
  }

  const gap = topMuscleGap(stats.muscleDistribution);
  if (gap) {
    return {
      id: 'muscle-balance',
      kind: 'recovery_gap',
      severity: 'info',
      title: 'Exposure balance',
      body: `${gap.low.replace('_', ' ')} volume is lower than ${gap.high.replace('_', ' ')} — consider adding work`,
      href: '/(app)/muscle-distribution',
      ruleVersion: COACHING_RULE_VERSION,
    };
  }

  const readyCount = (stats.prs ?? []).filter((p) => p.achievedAt >= now - 14 * 86_400_000).length;
  if (readyCount > 0 && thisWeek && thisWeek.sessions >= 2) {
    return {
      id: 'overload-ready',
      kind: 'overload_ready',
      severity: 'success',
      title: 'Progression window',
      body: 'Recent PRs — check suggested loads on your next routine',
      href: '/(app)/(tabs)/workouts',
      ruleVersion: COACHING_RULE_VERSION,
    };
  }

  return null;
}

/** Brief post-workout coaching lines for the summary screen. */
export function postSessionInsights(input: {
  prCount: number;
  volumeDeltaPct: number | null;
  suggestions: { exerciseName: string; reasonText: string }[];
}): string[] {
  const lines: string[] = [];
  if (input.prCount > 0) {
    lines.push(`${input.prCount} PR${input.prCount === 1 ? '' : 's'} today — strong work.`);
  }
  if (input.volumeDeltaPct != null) {
    const sign = input.volumeDeltaPct >= 0 ? '+' : '';
    lines.push(`Volume ${sign}${input.volumeDeltaPct}% vs last time on this routine.`);
  }
  for (const s of input.suggestions.slice(0, 2)) {
    lines.push(`Next ${s.exerciseName}: ${s.reasonText}`);
  }
  return lines.slice(0, 3);
}
