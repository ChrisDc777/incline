import { useCallback, useEffect, useState } from 'react';

import { getActiveWorkout, type SessionWorkout } from '@/db/queries';
import { useActiveWorkout } from '@/store/active-workout-store';

/**
 * Reactive hook that loads the in-progress session. It watches the Zustand
 * activeLogId and refetches whenever it changes (workout started/cleared),
 * so the active session bar appears/disappears instantly.
 */
export function useActiveSession() {
  const [session, setSession] = useState<SessionWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const activeLogId = useActiveWorkout((s) => s.activeLogId);
  const setActive = useActiveWorkout((s) => s.setActive);
  const clear = useActiveWorkout((s) => s.clear);

  const fetchSession = useCallback(async () => {
    try {
      const data = await getActiveWorkout();
      setSession(data);
      if (data) setActive(data.id);
      else clear();
    } catch {
      setSession(null);
      clear();
    } finally {
      setLoading(false);
    }
  }, [setActive, clear]);

  // Fetch on mount AND whenever activeLogId changes
  useEffect(() => {
    fetchSession();
  }, [activeLogId, fetchSession]);

  const nextExercise = session?.sets
    ? session.sets.filter((s) => !s.completed)[0]?.exerciseName
    : undefined;

  return { session, loading, refetch: fetchSession, nextExercise };
}
