import * as SQLite from 'expo-sqlite';

import { DB_NAME } from '@/constants/config';
import { SCHEMA_STATEMENTS, SCHEMA_VERSION } from './schema';
import { seedDatabase } from './seed';

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

    _db = database;
    return database;
  })();
  return _ready;
}

/** True once openDatabase() has resolved at least once. */
export function isDatabaseReady(): boolean {
  return _db !== null;
}
