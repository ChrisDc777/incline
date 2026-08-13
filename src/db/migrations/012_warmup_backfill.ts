import type { SQLiteDatabase } from 'expo-sqlite';

import { idsToTagAsWarmup, type WarmupCandidateSet } from '../../coaching/warmup-backfill';
import type { Migration } from './types';

/**
 * Heuristic backfill: tag pre-migration warm-up prefixes as `warmup`
 * so overload / PR math stops treating them as working sets.
 */
export const migration012: Migration = {
  version: 12,
  name: 'warmup_backfill',
  async up(db: SQLiteDatabase) {
    const rows = await db.getAllAsync<{
      id: number;
      workout_log_id: number;
      exercise_id: number;
      set_index: number;
      weight: number;
      completed: number;
      set_type: string | null;
    }>(
      `SELECT id, workout_log_id, exercise_id, set_index, weight, completed, set_type
       FROM set_entries
       WHERE deleted_at IS NULL`,
    );
    const candidates: WarmupCandidateSet[] = rows.map((r) => ({
      id: r.id,
      workoutLogId: r.workout_log_id,
      exerciseId: r.exercise_id,
      setIndex: r.set_index,
      weight: r.weight,
      completed: r.completed === 1,
      setType: r.set_type,
    }));
    const ids = idsToTagAsWarmup(candidates);
    if (ids.length === 0) return;

    const now = Date.now();
    const chunkSize = 80;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      await db.runAsync(
        `UPDATE set_entries
         SET set_type = 'warmup', updated_at = ?
         WHERE id IN (${placeholders})
           AND (set_type IS NULL OR set_type = 'working')`,
        now,
        ...chunk,
      );
    }
  },
};
