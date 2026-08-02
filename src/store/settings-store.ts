import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/config';
import { kvStorage } from '@/db/kv';
import type { Settings, Unit, ThemeMode } from '@/db/types';

interface SettingsState extends Settings {
  setUnit: (unit: Unit) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHaptics: (enabled: boolean) => void;
  setRestSound: (enabled: boolean) => void;
  setAutoStartRest: (enabled: boolean) => void;
  setDefaultRestSeconds: (seconds: number) => void;
  setShowWarmUpSets: (enabled: boolean) => void;
}

const DEFAULT_REST_OPTIONS = [30, 60, 90, 120] as const;

/**
 * Minimal global settings store. The only genuinely cross-screen, persisted
 * global state in the app. Persisted to the SQLite kv table (no AsyncStorage).
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'metric',
      themeMode: 'system',
      hapticsEnabled: true,
      restSoundEnabled: true,
      autoStartRest: true,
      defaultRestSeconds: 90,
      showWarmUpSets: true,
      setUnit: (unit) => set({ unit }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setHaptics: (enabled) => set({ hapticsEnabled: enabled }),
      setRestSound: (enabled) => set({ restSoundEnabled: enabled }),
      setAutoStartRest: (enabled) => set({ autoStartRest: enabled }),
      setDefaultRestSeconds: (seconds) => set({ defaultRestSeconds: seconds }),
      setShowWarmUpSets: (enabled) => set({ showWarmUpSets: enabled }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => ({
        unit: s.unit,
        themeMode: s.themeMode,
        hapticsEnabled: s.hapticsEnabled,
        restSoundEnabled: s.restSoundEnabled,
        autoStartRest: s.autoStartRest,
        defaultRestSeconds: s.defaultRestSeconds,
        showWarmUpSets: s.showWarmUpSets,
      }),
    },
  ),
);

export { DEFAULT_REST_OPTIONS };
