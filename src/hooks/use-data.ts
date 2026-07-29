import { useCallback, useEffect, useRef, useState } from 'react';

import { useAsync } from './use-async';
import {
  getExercise,
  getExerciseHistory,
  getProgram,
  getProfile,
  getProgressStats,
  getSuggestedTemplate,
  getTemplate,
  listExercises,
  listPrograms,
  listTemplateSummaries,
  listWorkoutLogs,
  searchExercises,
  type ExerciseFilters,
} from '@/db/queries';
import type { Exercise, MuscleGroup, PR, Program, ProgressStats, SearchHit, UserProfile, WorkoutLog, WorkoutTemplate } from '@/db/types';

/* ---- catalog ---- */
export function useExercises() {
  return useAsync<Exercise[]>(() => listExercises(), []);
}
export function useExercise(id: number) {
  return useAsync<Exercise | null>(() => getExercise(id), [id]);
}
export function useSearchExercises(query: string, filters?: ExerciseFilters) {
  return useAsync<SearchHit[]>(
    () => searchExercises(query, filters),
    [query, filters?.muscle, filters?.equipment, filters?.pattern],
  );
}
export function useExerciseHistory(exerciseId: number) {
  return useAsync(() => getExerciseHistory(exerciseId), [exerciseId]);
}

/* ---- templates & programs ---- */
export function useTemplateSummaries() {
  return useAsync(() => listTemplateSummaries(), []);
}
export function useTemplate(id: number) {
  return useAsync<WorkoutTemplate | null>(() => getTemplate(id), [id]);
}
export function useSuggestedTemplate() {
  return useAsync<WorkoutTemplate | null>(() => getSuggestedTemplate(), []);
}
export function usePrograms() {
  return useAsync<Program[]>(() => listPrograms(), []);
}
export function useProgram(id: number) {
  return useAsync<Program | null>(() => getProgram(id), [id]);
}

/* ---- progress & profile ---- */
export function useProgressStats(weeks = 8) {
  return useAsync<ProgressStats>(() => getProgressStats(weeks), [weeks]);
}
export function useProfile() {
  return useAsync<UserProfile>(() => getProfile(), []);
}

/* ---- paginated history (infinite scroll) ---- */
export function useWorkoutLogs() {
  const [items, setItems] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const load = useCallback(async (reset: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const offset = reset ? 0 : offsetRef.current;
      const page = await listWorkoutLogs(offset);
      setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
      offsetRef.current = page.nextOffset ?? offset;
      setHasMore(page.nextOffset !== null);
    } catch (e) {
      setError(e as Error);
      if (reset) setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore: () => {
      if (!loading && hasMore) load(false);
    },
    refresh: () => load(true),
    prs: [] as PR[],
    muscleFocus: [] as MuscleGroup[],
  };
}

/* ---- active workout / session ---- */
import { getActiveWorkout, getWorkoutLog, type SessionWorkout } from '@/db/queries';

export function useActiveSession() {
  return useAsync<SessionWorkout | null>(() => getActiveWorkout(), []);
}

export function useWorkoutLog(id: number) {
  return useAsync<SessionWorkout | null>(() => getWorkoutLog(id), [id]);
}

/* ---- haptics ---- */
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useSettings } from '@/store/settings-store';

export function useHaptics() {
  const { hapticsEnabled } = useSettings();
  const impact = useCallback(() => {
    if (hapticsEnabled) impactAsync(ImpactFeedbackStyle.Medium);
  }, [hapticsEnabled]);
  return { impact };
}
