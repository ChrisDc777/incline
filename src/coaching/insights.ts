import type { MuscleDistribution, ProgressStats, Unit, WeeklyVolume } from '@/db/types';
import { formatVolume } from '@/db/calc';
import { MUSCLE_LABELS } from '@/lib/labels';
import { COACHING_RULE_VERSION, type CoachingInsight } from './types';
import { deloadInsight, detectDeload } from './deload';

const RECOVERY_GAP_DAYS = 8;
const IMBALANCE_RATIO = 1.4;

function muscleLabel(muscle: string): string {
  return MUSCLE_LABELS[muscle as keyof typeof MUSCLE_LABELS] ?? muscle.replace('_', ' ');
}

export function topMuscleGap(muscles: MuscleDistribution[]): { high: string; low: string } | null {
  if (muscles.length < 2) return null;
  const sorted = [...muscles].sort((a, b) => b.sets - a.sets);
  const high = sorted[0];
  const low = sorted[sorted.length - 1];
  if (high.sets <= 0 || low.sets <= 0) return null;
  if (high.sets / low.sets < IMBALANCE_RATIO) return null;
  return { high: high.muscle, low: low.muscle };
}

export function recoveryGapInsights(muscleExposureDays: Record<string, number> | null): CoachingInsight[] {
  if (!muscleExposureDays) return [];
  const out: CoachingInsight[] = [];
  for (const [muscle, days] of Object.entries(muscleExposureDays)) {
    if (days < RECOVERY_GAP_DAYS) continue;
    out.push({
      id: `recovery-${muscle}`,
      kind: 'recovery_gap',
      severity: 'info',
      title: 'Recovery gap',
      body: `${muscleLabel(muscle)} hasn't been trained in ${days} days`,
      href: '/(app)/muscle-distribution',
      ruleVersion: COACHING_RULE_VERSION,
    });
  }
  return out;
}

export function muscleBalanceInsights(muscles: MuscleDistribution[]): CoachingInsight[] {
  const gap = topMuscleGap(muscles);
  if (!gap) return [];
  return [
    {
      id: 'muscle-balance',
      kind: 'muscle_balance',
      severity: 'info',
      title: 'Exposure balance',
      body: `${muscleLabel(gap.low)} volume is lower than ${muscleLabel(gap.high)} — consider adding work`,
      href: '/(app)/muscle-distribution',
      ruleVersion: COACHING_RULE_VERSION,
    },
  ];
}

export interface CoachingInsightInput {
  stats: ProgressStats | null | undefined;
  unit: Unit;
  muscleExposureDays?: Record<string, number> | null;
  weeklyStreak?: number;
  lastDeloadAppliedAt?: number | null;
  deloadSnoozeUntil?: number | null;
  now?: number;
}

function volumeTrendInsight(weeks: WeeklyVolume[], unit: Unit): CoachingInsight | null {
  const thisWeek = weeks[weeks.length - 1];
  const prevWeek = weeks.length > 1 ? weeks[weeks.length - 2] : null;
  if (!prevWeek || prevWeek.volume <= 0 || !thisWeek) return null;
  const delta = Math.round(((thisWeek.volume - prevWeek.volume) / prevWeek.volume) * 100);
  if (Math.abs(delta) < 10) return null;
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

/** Ranked coaching insights for Home and other surfaces. */
export function collectCoachingInsights(input: CoachingInsightInput): CoachingInsight[] {
  const { stats, unit } = input;
  const now = input.now ?? Date.now();
  if (!stats || stats.totalSessions < 3) return [];

  const out: CoachingInsight[] = [];
  const weeks = stats.weeklyVolume ?? [];

  const deload = detectDeload({
    weeklyStreak: input.weeklyStreak ?? stats.streak,
    weeklyVolumes: weeks,
    lastAppliedAt: input.lastDeloadAppliedAt,
    snoozeUntil: input.deloadSnoozeUntil,
    now,
  });
  if (deload) out.push(deloadInsight(deload));

  const trend = volumeTrendInsight(weeks, unit);
  if (trend) out.push(trend);

  out.push(...recoveryGapInsights(input.muscleExposureDays ?? null));
  out.push(...muscleBalanceInsights(stats.muscleDistribution));

  const thisWeek = weeks[weeks.length - 1];
  const readyCount = (stats.prs ?? []).filter((p) => p.achievedAt >= now - 14 * 86_400_000).length;
  if (readyCount > 0 && thisWeek && thisWeek.sessions >= 2) {
    out.push({
      id: 'overload-ready',
      kind: 'overload_ready',
      severity: 'success',
      title: 'Progression window',
      body: 'Recent PRs — check suggested loads on your next routine',
      href: '/(app)/(tabs)/workouts',
      ruleVersion: COACHING_RULE_VERSION,
    });
  }

  return out;
}

/** Pick the single best coaching insight for Home from existing aggregates. */
export function pickHomeCoachingInsight(
  stats: ProgressStats | null | undefined,
  unit: Unit,
  muscleExposureDays: Record<string, number> | null,
  extras?: Omit<CoachingInsightInput, 'stats' | 'unit' | 'muscleExposureDays'>,
): CoachingInsight | null {
  return collectCoachingInsights({
    stats,
    unit,
    muscleExposureDays,
    ...extras,
  })[0] ?? null;
}

/** Brief post-workout coaching lines for the summary screen. */
export function postSessionInsights(input: {
  prCount: number;
  volumeDeltaPct: number | null;
  suggestions: { exerciseName: string; reasonText: string }[];
  fatigueLine?: string | null;
}): string[] {
  const lines: string[] = [];
  if (input.fatigueLine) lines.push(input.fatigueLine);
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
