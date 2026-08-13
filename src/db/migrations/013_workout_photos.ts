import type { SQLiteDatabase } from 'expo-sqlite';

import { hasTable } from './helpers';
import type { Migration } from './types';

/** Local gym pics attached to a finished session. Not synced (files stay on device). */
export const migration013: Migration = {
  version: 13,
  name: 'workout_photos',
  async up(db: SQLiteDatabase) {
    if (await hasTable(db, 'workout_photos')) return;
    await db.execAsync(`
      CREATE TABLE workout_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_log_id INTEGER NOT NULL,
        uri TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        uuid TEXT,
        deleted_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT 0
      )
    `);
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_workout_photos_log ON workout_photos(workout_log_id, sort_order)',
    );
  },
};
