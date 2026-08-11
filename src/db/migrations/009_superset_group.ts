import type { Migration } from './types';
import { hasColumn } from './helpers';

/**
 * v8 → v9: Superset / circuit grouping on templates and logged sets.
 */
export const migration009: Migration = {
  version: 9,
  name: 'superset_group',
  async up(db) {
    if (!(await hasColumn(db, 'template_exercises', 'superset_group'))) {
      await db.execAsync('ALTER TABLE template_exercises ADD COLUMN superset_group INTEGER');
    }
    if (!(await hasColumn(db, 'set_entries', 'superset_group'))) {
      await db.execAsync('ALTER TABLE set_entries ADD COLUMN superset_group INTEGER');
    }
  },
};
