import type { SQLiteDatabase } from 'expo-sqlite';

import { migration002 } from './002_exercise_columns';
import { migration003 } from './003_exercisedb_columns';
import { migration004 } from './004_avatar_url';
import { migration005 } from './005_nullable_exercise_cols';
import { migration006 } from './006_owner_user_id';
import { migration007 } from './007_sync_readiness';
import { migration008 } from './008_program_builder';
import { migration009 } from './009_superset_group';
import type { Migration } from './types';

export type { Migration } from './types';
export { hasColumn, hasTable } from './helpers';

/** Ordered migrations. Version numbers must be unique and increasing. */
export const MIGRATIONS: Migration[] = [
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 1;

/**
 * Apply all migrations with version > currentVersion, in order.
 * Throws on failure so the caller does not bump the stored version.
 */
export async function runMigrations(
  db: SQLiteDatabase,
  currentVersion: number,
): Promise<number> {
  let version = currentVersion;
  for (const migration of MIGRATIONS) {
    if (migration.version <= version) continue;
    console.info(`[db] Applying migration ${migration.version}: ${migration.name}`);
    try {
      await migration.up(db);
    } catch (err) {
      console.error(`[db] Migration ${migration.version} (${migration.name}) failed`, err);
      throw err;
    }
    version = migration.version;
    await db.runAsync(
      "INSERT INTO schema_meta (key, value) VALUES ('version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      String(version),
    );
  }
  return version;
}
