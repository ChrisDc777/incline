import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/config';
import { kvStorage } from '@/db/kv';
import type { Settings, Unit, ThemeMode, AccentTheme, CalendarHeatMetric } from '@/db/types';
import { isCalendarHeatMetric } from '@/db/types';
import { DEFAULT_ACCENT_THEME, isAccentTheme } from '@/lib/accent-themes';

interface SettingsState extends Settings {
  setUnit: (unit: Unit) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentTheme: (accent: AccentTheme) => void;
  setHaptics: (enabled: boolean) => void;
  setRestSound: (enabled: boolean) => void;
  setAutoStartRest: (enabled: boolean) => void;
  setDefaultRestSeconds: (seconds: number) => void;
  setShowWarmUpSets: (enabled: boolean) => void;
  setCalendarHeatMetric: (metric: CalendarHeatMetric) => void;
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
      accentTheme: DEFAULT_ACCENT_THEME,
      hapticsEnabled: true,
      restSoundEnabled: true,
      autoStartRest: true,
      defaultRestSeconds: 90,
      showWarmUpSets: true,
      calendarHeatMetric: 'volume',
      setUnit: (unit) => set({ unit }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setAccentTheme: (accentTheme) => set({ accentTheme }),
      setHaptics: (enabled) => set({ hapticsEnabled: enabled }),
      setRestSound: (enabled) => set({ restSoundEnabled: enabled }),
      setAutoStartRest: (enabled) => set({ autoStartRest: enabled }),
      setDefaultRestSeconds: (seconds) => set({ defaultRestSeconds: seconds }),
      setShowWarmUpSets: (enabled) => set({ showWarmUpSets: enabled }),
      setCalendarHeatMetric: (calendarHeatMetric) => set({ calendarHeatMetric }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => ({
        unit: s.unit,
        themeMode: s.themeMode,
        accentTheme: s.accentTheme,
        hapticsEnabled: s.hapticsEnabled,
        restSoundEnabled: s.restSoundEnabled,
        autoStartRest: s.autoStartRest,
        defaultRestSeconds: s.defaultRestSeconds,
        showWarmUpSets: s.showWarmUpSets,
        calendarHeatMetric: s.calendarHeatMetric,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Settings>;
        return {
          ...current,
          ...p,
          accentTheme: isAccentTheme(p.accentTheme) ? p.accentTheme : DEFAULT_ACCENT_THEME,
          calendarHeatMetric: isCalendarHeatMetric(p.calendarHeatMetric)
            ? p.calendarHeatMetric
            : 'volume',
        };
      },
    },
  ),
);

export { DEFAULT_REST_OPTIONS };
