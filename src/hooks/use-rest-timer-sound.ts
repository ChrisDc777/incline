import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

let soundLoaded = false;
let sound: Audio.Sound | null = null;

async function loadSound() {
  if (soundLoaded) return;
  try {
    const { sound: loaded } = await Audio.Sound.createAsync(
      require('../../assets/sounds/rest-complete.mp3'),
      { shouldPlay: false }
    );
    sound = loaded;
    soundLoaded = true;
  } catch {
    // Sound file not present — haptics-only mode
    soundLoaded = true;
  }
}

/**
 * Plays a sound + haptic notification when the rest timer finishes.
 * Falls back to haptics-only if no sound file is present at assets/sounds/rest-complete.mp3.
 */
export function useRestTimerSound() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const play = useCallback(async () => {
    try {
      // Haptic triple-burst
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      intervalRef.current = setInterval(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);
      setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 600);
    } catch {
      // Silent fail — haptics is enhancement
    }

    // Try playing sound (non-blocking)
    try {
      await loadSound();
      if (sound) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch {
      // No sound file — continue with haptics only
    }
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    try {
      sound?.stopAsync();
    } catch { /* ignore */ }
  }, []);

  return { play, stop };
}
