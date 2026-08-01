import * as SQLite from 'expo-sqlite';

import { DB_NAME } from '@/constants/config';
import { SCHEMA_STATEMENTS, SCHEMA_VERSION } from './schema';
import { seedDatabase } from './seed';
import { seedFromSupabase } from './seed-supabase';

let _db: SQLite.SQLiteDatabase | null = null;
let _ready: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Open (and lazily migrate + seed) the database. Returns a cached connection,
 * so calling this from every query is cheap after the first run.
 *
 * The active workout is the single source of truth for in-progress sessions and
 * lives in `workout_logs` (rows with `ended_at IS NULL`). This makes a session
 * crash/resume safe without holding the whole workout in memory.
 */
export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_ready) return _ready;
  _ready = (async () => {
    const database = await SQLite.openDatabaseAsync(DB_NAME);
    await database.execAsync('PRAGMA journal_mode = WAL');
    await database.execAsync('PRAGMA foreign_keys = ON');

    for (const stmt of SCHEMA_STATEMENTS) {
      await database.execAsync(stmt);
    }

    const meta = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM schema_meta WHERE key = 'version'",
    );
    const current = meta ? Number(meta.value) : 0;
    if (current < SCHEMA_VERSION) {
      // v1 → v2: add is_custom column to exercises
      if (current < 2) {
        try {
          await database.execAsync('ALTER TABLE exercises ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0');
        } catch { /* column may already exist */ }
        try {
          await database.execAsync('ALTER TABLE exercises ADD COLUMN default_rest_seconds INTEGER NOT NULL DEFAULT 90');
        } catch { /* column may already exist */ }
        try {
          await database.execAsync('ALTER TABLE user_profile ADD COLUMN experience_level TEXT NOT NULL DEFAULT \'intermediate\'');
        } catch { /* column may already exist */ }
      }
      // v2 → v3: add ExerciseDB columns + exercise_images table
      if (current < 3) {
        try {
          await database.execAsync('ALTER TABLE exercises ADD COLUMN source TEXT NOT NULL DEFAULT \'seed\'');
        } catch { /* column may already exist */ }
        try {
          await database.execAsync('ALTER TABLE exercises ADD COLUMN external_id TEXT');
        } catch { /* column may already exist */ }
        try {
          await database.execAsync('ALTER TABLE exercises ADD COLUMN difficulty TEXT NOT NULL DEFAULT \'intermediate\'');
        } catch { /* column may already exist */ }
        try {
          await database.execAsync(`CREATE TABLE IF NOT EXISTS exercise_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exercise_id INTEGER NOT NULL,
            url TEXT NOT NULL,
            is_primary INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
          )`);
          await database.execAsync('CREATE INDEX IF NOT EXISTS idx_exercise_images_exercise ON exercise_images(exercise_id, sort_order)');
        } catch { /* table may already exist */ }
      }
      // v3 → v4: add avatar_url to user_profile
      if (current < 4) {
        try {
          await database.execAsync('ALTER TABLE user_profile ADD COLUMN avatar_url TEXT');
        } catch { /* column may already exist */ }
      }
      // v4 → v5: Rebuild exercises table with nullable columns for ExerciseGymGifsDB.
      // SQLite can't ALTER column nullability, so we drop + recreate.
      if (current < 5) {
        await database.execAsync('DELETE FROM exercise_images');
        await database.execAsync('DELETE FROM exercise_instructions');
        await database.execAsync('DELETE FROM exercise_secondary_muscles');
        await database.execAsync('DELETE FROM exercise_aliases');
        await database.execAsync('DELETE FROM exercises');
        await database.execAsync("DELETE FROM schema_meta WHERE key = 'seeded'");
        await database.execAsync("DELETE FROM schema_meta WHERE key = 'supabase_seeded'");
        // Recreate with correct schema
        await database.execAsync(`CREATE TABLE IF NOT EXISTS exercises (
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
      }
      await database.runAsync(
        "INSERT INTO schema_meta (key, value) VALUES ('version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        String(SCHEMA_VERSION),
      );
    }

    const seeded = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM schema_meta WHERE key = 'seeded'",
    );
    if (!seeded) {
      await seedDatabase(database);
      await database.runAsync(
        "INSERT INTO schema_meta (key, value) VALUES ('seeded', '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      );
    }

    // Sync Supabase exercises into local SQLite for offline use.
    // Runs on every launch — idempotent, backfills missing images/instructions for existing exercises.
    await seedFromSupabase(database);

    _db = database;
    return database;
  })();
  return _ready;
}

/** True once openDatabase() has resolved at least once. */
export function isDatabaseReady(): boolean {
  return _db !== null;
}
