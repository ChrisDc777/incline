import type { Migration } from './types';
import { hasColumn } from './helpers';
import * as Crypto from 'expo-crypto';

/**
 * v7 → v8: User-owned programs (is_custom, uuid, soft delete) for program builder.
 */
export const migration008: Migration = {
  version: 8,
  name: 'program_builder',
  async up(db) {
    if (!(await hasColumn(db, 'programs', 'is_custom'))) {
      await db.execAsync(
        'ALTER TABLE programs ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0',
      );
    }
    if (!(await hasColumn(db, 'programs', 'uuid'))) {
      await db.execAsync('ALTER TABLE programs ADD COLUMN uuid TEXT');
    }
    if (!(await hasColumn(db, 'programs', 'deleted_at'))) {
      await db.execAsync('ALTER TABLE programs ADD COLUMN deleted_at INTEGER');
    }
    if (!(await hasColumn(db, 'program_workouts', 'uuid'))) {
      await db.execAsync('ALTER TABLE program_workouts ADD COLUMN uuid TEXT');
    }
    if (!(await hasColumn(db, 'program_workouts', 'deleted_at'))) {
      await db.execAsync('ALTER TABLE program_workouts ADD COLUMN deleted_at INTEGER');
    }

    const programs = await db.getAllAsync<{ id: number }>('SELECT id FROM programs WHERE uuid IS NULL');
    for (const p of programs) {
      await db.runAsync('UPDATE programs SET uuid = ? WHERE id = ?', Crypto.randomUUID(), p.id);
    }
    const slots = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM program_workouts WHERE uuid IS NULL',
    );
    for (const s of slots) {
      await db.runAsync('UPDATE program_workouts SET uuid = ? WHERE id = ?', Crypto.randomUUID(), s.id);
    }

    await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_uuid ON programs(uuid)');
    await db.execAsync(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_program_workouts_uuid ON program_workouts(uuid)',
    );
  },
};
