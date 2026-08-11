import type { Migration } from './types';
import { hasTable } from './helpers';

/**
 * v9 → v10: Circumference / body-part measurements alongside bodyweight.
 */
export const migration010: Migration = {
  version: 10,
  name: 'body_measurements',
  async up(db) {
    if (!(await hasTable(db, 'body_measurements'))) {
      await db.execAsync(`
        CREATE TABLE body_measurements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          metric TEXT NOT NULL,
          value REAL NOT NULL,
          unit TEXT NOT NULL,
          recorded_at INTEGER NOT NULL,
          uuid TEXT,
          deleted_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL DEFAULT 0
        )
      `);
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_body_measurements_metric ON body_measurements(metric, recorded_at DESC)',
      );
    }
  },
};
