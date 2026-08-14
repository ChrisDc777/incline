import type { SQLiteDatabase } from 'expo-sqlite';

import { hasColumn } from './helpers';
import type { Migration } from './types';

/** Optional RPE 1–10 on working sets. Never required to complete a set. */
export const migration014: Migration = {
  version: 14,
  name: 'set_rpe',
  async up(db: SQLiteDatabase) {
    if (!(await hasColumn(db, 'set_entries', 'rpe'))) {
      await db.execAsync('ALTER TABLE set_entries ADD COLUMN rpe INTEGER');
    }
  },
};
