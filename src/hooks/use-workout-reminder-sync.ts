import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { syncWorkoutReminderSchedules } from '@/lib/notifications/reminders';
import { useSettings } from '@/store/settings-store';

/**
 * Keep OS weekly reminder schedules aligned with Settings prefs.
 * Runs on mount, prefs change, and return to foreground (OS may drop schedules).
 */
export function useWorkoutReminderSync() {
  const enabled = useSettings((s) => s.workoutRemindersEnabled);
  const days = useSettings((s) => s.workoutReminderDays);
  const hour = useSettings((s) => s.workoutReminderHour);
  const minute = useSettings((s) => s.workoutReminderMinute);
  const syncing = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        if (cancelled) return;
        await syncWorkoutReminderSchedules({ enabled, days, hour, minute });
      } finally {
        syncing.current = false;
      }
    };

    void run();

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') void run();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabled, days, hour, minute]);
}
