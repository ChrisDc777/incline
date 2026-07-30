import { useEffect, useMemo } from 'react';

import { useAsync } from './use-async';
import { getActiveWorkout } from '@/db/queries';
import { useActiveWorkout } from '@/store/active-workout-store';
import type { SessionWorkout } from '@/db/queries';

/**
 * Loads the in-progress session (workout_logs row with ended_at IS NULL) and
 * reconciles the minimal active-workout id store. Because the session itself
 * lives in SQLite, it is always resumable after a restart or crash.
 */
export function useActiveSession() {
  const { data, loading, error, refetch } = useAsync<SessionWorkout | null>(() => getActiveWorkout(), []);
  const setActive = useActiveWorkout((s) => s.setActive);
  const clear = useActiveWorkout((s) => s.clear);

  useEffect(() => {
    if (data) setActive(data.id);
    else if (!loading) clear();
  }, [data, loading, setActive, clear]);

  const nextExercise = useMemo(() => {
    if (!data?.sets) return undefined;
    const incomplete = data.sets.filter((s) => !s.completed);
    if (incomplete.length === 0) return undefined;
    return incomplete[0].exerciseName;
  }, [data]);

  return { session: data, loading, error, refetch, nextExercise };
}
