import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/config';
import { kvStorage } from '@/db/kv';
import type { Settings, Unit, ThemeMode } from '@/db/types';

interface SettingsState extends Settings {
  setUnit: (unit: Unit) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHaptics: (enabled: boolean) => void;
}

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
      setUnit: (unit) => set({ unit }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setHaptics: (enabled) => set({ hapticsEnabled: enabled }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => ({
        unit: s.unit,
        themeMode: s.themeMode,
        hapticsEnabled: s.hapticsEnabled,
      }),
    },
  ),
);
