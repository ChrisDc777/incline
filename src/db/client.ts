import * as SQLite from 'expo-sqlite';

import { DB_NAME } from '@/constants/config';
import { LATEST_SCHEMA_VERSION, runMigrations } from './migrations';
import { SCHEMA_STATEMENTS, SCHEMA_VERSION } from './schema';
import { seedDatabase } from './seed';
import { seedFromSupabase } from './seed-supabase';

let _db: SQLite.SQLiteDatabase | null = null;
let _ready: Promise<SQLite.SQLiteDatabase> | null = null;

if (SCHEMA_VERSION !== LATEST_SCHEMA_VERSION) {
  console.warn(
    `[db] SCHEMA_VERSION (${SCHEMA_VERSION}) != LATEST_SCHEMA_VERSION (${LATEST_SCHEMA_VERSION})`,
  );
}

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

    if (current === 0) {
      // Fresh install: CREATE IF NOT EXISTS already applied the latest schema.
      await database.runAsync(
        "INSERT INTO schema_meta (key, value) VALUES ('version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        String(SCHEMA_VERSION),
      );
    } else if (current < SCHEMA_VERSION) {
      await runMigrations(database, current);
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

    // Catalog sync is offline-friendly and idempotent — do not block DB readiness.
    void seedFromSupabase(database).catch((err) => {
      console.warn('[db] Supabase exercise seed failed', err);
    });

    return database;
  })();
  return _ready;
}

/** True once openDatabase() has resolved at least once. */
export function isDatabaseReady(): boolean {
  return _db !== null;
}

/** Test helper: clear the cached connection (does not delete the file). */
export function __resetDatabaseCacheForTests(): void {
  _db = null;
  _ready = null;
}
