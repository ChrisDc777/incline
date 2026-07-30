import { useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';

/**
 * Plays a strong haptic notification when the rest timer finishes.
 * Three quick impacts in sequence for an unmistakable "time's up" feel.
 */
export function useRestTimerSound() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const play = useCallback(async () => {
    try {
      // Triple-burst haptic: 3 impacts spaced 200ms apart
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      intervalRef.current = setInterval(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);
      // Stop after 600ms (3 bursts total)
      setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 600);
    } catch {
      // Silent fail — haptics is enhancement
    }
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { play, stop };
}
