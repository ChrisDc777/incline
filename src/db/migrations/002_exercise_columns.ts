import type { Migration } from './types';
import { hasColumn } from './helpers';

/** v1 → v2: custom exercises, per-exercise rest, experience level. */
export const migration002: Migration = {
  version: 2,
  name: 'exercise_and_profile_columns',
  async up(db) {
    if (!(await hasColumn(db, 'exercises', 'is_custom'))) {
      await db.execAsync('ALTER TABLE exercises ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0');
    }
    if (!(await hasColumn(db, 'exercises', 'default_rest_seconds'))) {
      await db.execAsync(
        'ALTER TABLE exercises ADD COLUMN default_rest_seconds INTEGER NOT NULL DEFAULT 90',
      );
    }
    if (!(await hasColumn(db, 'user_profile', 'experience_level'))) {
      await db.execAsync(
        "ALTER TABLE user_profile ADD COLUMN experience_level TEXT NOT NULL DEFAULT 'intermediate'",
      );
    }
  },
};
