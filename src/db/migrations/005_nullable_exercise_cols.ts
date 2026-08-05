import type { Migration } from './types';

/**
 * v4 → v5: Rebuild exercises so movement_pattern / difficulty are nullable
 * (ExerciseGymGifsDB). Preserves all rows — does not wipe the catalog.
 */
export const migration005: Migration = {
  version: 5,
  name: 'nullable_exercise_columns',
  async up(db) {
    await db.execAsync('PRAGMA foreign_keys = OFF');
    try {
      await db.execAsync(`CREATE TABLE IF NOT EXISTS exercises_new (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        primary_muscle TEXT NOT NULL,
        movement_pattern TEXT,
        equipment TEXT NOT NULL,
        category TEXT NOT NULL,
        is_compound INTEGER NOT NULL DEFAULT 0,
        is_custom INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'seed',
        external_id TEXT,
        difficulty TEXT,
        default_rest_seconds INTEGER NOT NULL DEFAULT 90,
        tips TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`);

      await db.execAsync(`INSERT INTO exercises_new (
        id, name, primary_muscle, movement_pattern, equipment, category,
        is_compound, is_custom, source, external_id, difficulty,
        default_rest_seconds, tips, created_at, updated_at
      )
      SELECT
        id, name, primary_muscle, movement_pattern, equipment, category,
        is_compound, COALESCE(is_custom, 0), COALESCE(source, 'seed'), external_id, difficulty,
        COALESCE(default_rest_seconds, 90), tips, created_at, updated_at
      FROM exercises`);

      await db.execAsync('DROP TABLE exercises');
      await db.execAsync('ALTER TABLE exercises_new RENAME TO exercises');

      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name)');
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle ON exercises(primary_muscle)',
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_exercises_movement ON exercises(movement_pattern)',
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment)',
      );
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON');
    }
  },
};
