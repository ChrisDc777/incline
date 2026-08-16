import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { pickHomeCoachingInsight } from '@/coaching/insights';
import { DELOAD_APPLIED_KEY, DELOAD_SNOOZE_KEY } from '@/coaching/deload';
import { programPlanInsight } from '@/coaching/program-plan';
import { getTodayReadiness, setTodayReadiness } from '@/coaching/readiness-store';
import type { ReadinessLevel } from '@/coaching/types';
import { kvStorage } from '@/db/kv';
import {
  getActiveProgramPlanDiff,
  getMuscleExposureDays,
  getWeeklyConsistency,
  type WeeklyConsistency,
} from '@/db/queries';
import type { ProgressStats, Unit } from '@/db/types';
import { ANNOUNCEMENT_PACK } from '@/lib/announcements';
import {
  buildHomeContextCards,
  sameHomeContextCards,
  type HomeContextCard,
} from '@/lib/home-context';

export interface UseHomeCoachingContextOptions {
  stats: ProgressStats | null | undefined;
  unit: Unit;
  weeklyWorkoutGoal: number;
  dismissedAnnouncementIds: string[];
  onReadinessImpact?: () => void;
}

/** Loads Home coaching context: consistency, readiness, and ranked context cards. */
export function useHomeCoachingContext({
  stats,
  unit,
  weeklyWorkoutGoal,
  dismissedAnnouncementIds,
  onReadinessImpact,
}: UseHomeCoachingContextOptions) {
  const [consistency, setConsistency] = useState<WeeklyConsistency | null>(null);
  const [contextCards, setContextCards] = useState<HomeContextCard[]>([]);
  const [readiness, setReadiness] = useState<ReadinessLevel | null>(null);
  const didFocus = useRef(false);
  const contextGen = useRef(0);

  const refreshContext = useCallback(async () => {
    const gen = ++contextGen.current;
    const [cons, muscleDays, appliedRaw, snoozeRaw, planDiff, todayReady] = await Promise.all([
      getWeeklyConsistency(weeklyWorkoutGoal),
      getMuscleExposureDays(),
      kvStorage.getItem(DELOAD_APPLIED_KEY),
      kvStorage.getItem(DELOAD_SNOOZE_KEY),
      getActiveProgramPlanDiff(),
      getTodayReadiness(),
    ]);
    if (gen !== contextGen.current) return;
    setConsistency(cons);
    setReadiness(todayReady);
    const coaching = pickHomeCoachingInsight(stats, unit, muscleDays, {
      weeklyStreak: cons.currentWeeklyStreak,
      lastDeloadAppliedAt: appliedRaw ? Number(appliedRaw) : null,
      deloadSnoozeUntil: snoozeRaw ? Number(snoozeRaw) : null,
      programPlanInsight: planDiff ? programPlanInsight(planDiff) : null,
    });
    const recentPr = stats?.prs?.find((p) => p.achievedAt >= Date.now() - 14 * 86_400_000);
    const cards = buildHomeContextCards({
      stats,
      unit,
      weeklyGoal: weeklyWorkoutGoal,
      sessionsThisWeek: cons.sessionsThisWeek,
      goalMet: cons.goalMet,
      sessionsToGoal: cons.sessionsToGoal,
      dismissedAnnouncementIds,
      announcements: ANNOUNCEMENT_PACK,
      coachingTitle: coaching?.title ?? null,
      coachingSubtitle: coaching?.body ?? null,
      coachingHref: coaching?.href ?? null,
      prNudge: recentPr
        ? { exerciseName: recentPr.exerciseName, weight: recentPr.maxWeight, reps: recentPr.maxReps }
        : null,
    });
    setContextCards((prev) => (sameHomeContextCards(prev, cards) ? prev : cards));
  }, [stats, unit, weeklyWorkoutGoal, dismissedAnnouncementIds]);

  const onReadiness = useCallback(
    async (level: ReadinessLevel) => {
      setReadiness(level);
      await setTodayReadiness(level);
      onReadinessImpact?.();
    },
    [onReadinessImpact],
  );

  useFocusEffect(
    useCallback(() => {
      if (didFocus.current) {
        void refreshContext();
      } else {
        didFocus.current = true;
      }
    }, [refreshContext]),
  );

  useEffect(() => {
    if (stats) void refreshContext();
  }, [stats, refreshContext]);

  return { consistency, contextCards, readiness, onReadiness, refreshContext };
}
