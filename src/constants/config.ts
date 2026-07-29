/** App-wide constants. Storage keys live here as the single source of truth. */
export const DB_NAME = 'incline.db';

export const APP = {
  name: 'Incline',
  tagline: 'Train with intent',
} as const;

export const PAGINATION = {
  /** Number of history rows fetched per page (infinite scroll). */
  pageSize: 20,
} as const;

/** Zustand persist keys (stored in the SQLite kv table). */
export const STORAGE_KEYS = {
  settings: 'settings',
  activeWorkout: 'active-workout',
} as const;
