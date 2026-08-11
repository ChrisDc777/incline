import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/config';
import { kvStorage } from '@/db/kv';
import type { Settings, Unit, ThemeMode, AccentTheme, CalendarHeatMetric, WeekStartsOn } from '@/db/types';
import { isCalendarHeatMetric, isWeekStartsOn } from '@/db/types';
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
  setWeekStartsOn: (day: WeekStartsOn) => void;
  setKeepScreenAwake: (enabled: boolean) => void;
  setWorkoutRemindersEnabled: (enabled: boolean) => void;
  setWorkoutReminderDays: (days: number[]) => void;
  setWorkoutReminderTime: (hour: number, minute: number) => void;
}

const DEFAULT_REST_OPTIONS = [30, 60, 90, 120] as const;

/** Default reminder days: Mon / Wed / Fri (JS weekdays). */
export const DEFAULT_WORKOUT_REMINDER_DAYS = [1, 3, 5] as const;

export const WORKOUT_REMINDER_TIME_PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: '6:00', hour: 6, minute: 0 },
  { label: '7:00', hour: 7, minute: 0 },
  { label: '12:00', hour: 12, minute: 0 },
  { label: '17:00', hour: 17, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '19:00', hour: 19, minute: 0 },
  { label: '20:00', hour: 20, minute: 0 },
];

function sanitizeReminderDays(days: unknown): number[] {
  if (!Array.isArray(days)) return [...DEFAULT_WORKOUT_REMINDER_DAYS];
  const cleaned = [
    ...new Set(
      days
        .map((d) => (typeof d === 'number' ? d : Number(d)))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    ),
  ].sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : [...DEFAULT_WORKOUT_REMINDER_DAYS];
}

function sanitizeHour(hour: unknown, fallback = 18): number {
  if (typeof hour !== 'number' || !Number.isFinite(hour)) return fallback;
  return Math.min(23, Math.max(0, Math.round(hour)));
}

function sanitizeMinute(minute: unknown, fallback = 0): number {
  if (typeof minute !== 'number' || !Number.isFinite(minute)) return fallback;
  return Math.min(59, Math.max(0, Math.round(minute)));
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
      accentTheme: DEFAULT_ACCENT_THEME,
      hapticsEnabled: true,
      restSoundEnabled: true,
      autoStartRest: true,
      defaultRestSeconds: 90,
      showWarmUpSets: true,
      calendarHeatMetric: 'volume',
      weekStartsOn: 'monday',
      keepScreenAwake: true,
      workoutRemindersEnabled: false,
      workoutReminderDays: [...DEFAULT_WORKOUT_REMINDER_DAYS],
      workoutReminderHour: 18,
      workoutReminderMinute: 0,
      setUnit: (unit) => set({ unit }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setAccentTheme: (accentTheme) => set({ accentTheme }),
      setHaptics: (enabled) => set({ hapticsEnabled: enabled }),
      setRestSound: (enabled) => set({ restSoundEnabled: enabled }),
      setAutoStartRest: (enabled) => set({ autoStartRest: enabled }),
      setDefaultRestSeconds: (seconds) => set({ defaultRestSeconds: seconds }),
      setShowWarmUpSets: (enabled) => set({ showWarmUpSets: enabled }),
      setCalendarHeatMetric: (calendarHeatMetric) => set({ calendarHeatMetric }),
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
      setKeepScreenAwake: (keepScreenAwake) => set({ keepScreenAwake }),
      setWorkoutRemindersEnabled: (workoutRemindersEnabled) => set({ workoutRemindersEnabled }),
      setWorkoutReminderDays: (days) => set({ workoutReminderDays: sanitizeReminderDays(days) }),
      setWorkoutReminderTime: (hour, minute) =>
        set({
          workoutReminderHour: sanitizeHour(hour),
          workoutReminderMinute: sanitizeMinute(minute),
        }),
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
        weekStartsOn: s.weekStartsOn,
        keepScreenAwake: s.keepScreenAwake,
        workoutRemindersEnabled: s.workoutRemindersEnabled,
        workoutReminderDays: s.workoutReminderDays,
        workoutReminderHour: s.workoutReminderHour,
        workoutReminderMinute: s.workoutReminderMinute,
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
          weekStartsOn: isWeekStartsOn(p.weekStartsOn) ? p.weekStartsOn : 'monday',
          keepScreenAwake: typeof p.keepScreenAwake === 'boolean' ? p.keepScreenAwake : true,
          workoutRemindersEnabled:
            typeof p.workoutRemindersEnabled === 'boolean' ? p.workoutRemindersEnabled : false,
          workoutReminderDays: sanitizeReminderDays(p.workoutReminderDays),
          workoutReminderHour: sanitizeHour(p.workoutReminderHour, 18),
          workoutReminderMinute: sanitizeMinute(p.workoutReminderMinute, 0),
        };
      },
    },
  ),
);

export { DEFAULT_REST_OPTIONS };
