import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/config';
import { kvStorage } from '@/db/kv';

interface ActiveWorkoutState {
  /** id of the in-progress workout_log (ended_at IS NULL), or null. */
  activeLogId: number | null;
  setActive: (id: number | null) => void;
  clear: () => void;
}

/**
 * Holds only the active workout id. The session data itself lives in SQLite
 * (workout_logs + set_entries), so a session survives restarts/crashes. This
 * id lets the cross-tab mini-bar and resume prompt reference the open session
 * without re-querying on every render.
 */
export const useActiveWorkout = create<ActiveWorkoutState>()(
  persist(
    (set) => ({
      activeLogId: null,
      setActive: (activeLogId) => set({ activeLogId }),
      clear: () => set({ activeLogId: null }),
    }),
    {
      name: STORAGE_KEYS.activeWorkout,
      storage: createJSONStorage(() => kvStorage),
    },
  ),
);
