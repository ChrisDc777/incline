import type { Migration } from './types';
import { hasColumn, hasTable } from './helpers';

/** v2 → v3: ExerciseDB source metadata + images table. */
export const migration003: Migration = {
  version: 3,
  name: 'exercisedb_columns_and_images',
  async up(db) {
    if (!(await hasColumn(db, 'exercises', 'source'))) {
      await db.execAsync("ALTER TABLE exercises ADD COLUMN source TEXT NOT NULL DEFAULT 'seed'");
    }
    if (!(await hasColumn(db, 'exercises', 'external_id'))) {
      await db.execAsync('ALTER TABLE exercises ADD COLUMN external_id TEXT');
    }
    if (!(await hasColumn(db, 'exercises', 'difficulty'))) {
      await db.execAsync(
        "ALTER TABLE exercises ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'intermediate'",
      );
    }
    if (!(await hasTable(db, 'exercise_images'))) {
      await db.execAsync(`CREATE TABLE IF NOT EXISTS exercise_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      )`);
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_exercise_images_exercise ON exercise_images(exercise_id, sort_order)',
      );
    }
  },
};
