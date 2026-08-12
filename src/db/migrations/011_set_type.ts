import type { SQLiteDatabase } from 'expo-sqlite';

import { hasColumn } from './helpers';
import type { Migration } from './types';

/** Distinguish warm-up vs working sets for coaching calculations. */
export const migration011: Migration = {
  version: 11,
  name: 'set_type',
  async up(db: SQLiteDatabase) {
    if (!(await hasColumn(db, 'set_entries', 'set_type'))) {
      await db.execAsync(
        "ALTER TABLE set_entries ADD COLUMN set_type TEXT NOT NULL DEFAULT 'working'",
      );
    }
  },
};
