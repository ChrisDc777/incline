import { openDatabase } from '../client';
import { PAGINATION } from '@/constants/config';
import { newUuid } from '@/lib/uuid';
import { enqueueSync } from '@/sync/outbox';
import { exerciseRefForId } from '@/sync/exercise-ref';
import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  FeedWorkoutLog,
  MuscleGroup,
  Paginated,
  WorkoutLog,
} from '../types';
import { getLastSetsForExercise } from './exercises';
import {
  getSessionSets,
  mapLog,
  mapSet,
  recomputeVolume,
  type LogRow,
  type SessionWorkout,
  type SetRow,
  type TemplateExerciseRow,
} from './helpers';

export interface MuscleSplit {
  muscle: MuscleGroup;
  percentage: number;
  sets: number;
}

async function enqueueLogUpsert(logId: number): Promise<void> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<LogRow & { template_uuid: string | null }>(
    `SELECT w.*, t.uuid as template_uuid
     FROM workout_logs w
     LEFT JOIN workout_templates t ON t.id = w.template_id AND t.is_custom = 1
     WHERE w.id = ?`,
    logId,
  );
  if (!log?.uuid) return;
  await enqueueSync('workout_logs', log.uuid, log.deleted_at ? 'delete' : 'upsert', {
    template_uuid: log.template_uuid,
    name: log.name,
    started_at: log.started_at,
    ended_at: log.ended_at,
    duration_seconds: log.duration_seconds,
    total_volume: log.total_volume,
    unit: log.unit,
    notes: log.notes,
    created_at: log.created_at,
    updated_at: log.updated_at,
    deleted_at: log.deleted_at,
  });
}

async function enqueueSetUpsert(setId: number): Promise<void> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<SetRow & { log_uuid: string | null }>(
    `SELECT s.*, w.uuid as log_uuid FROM set_entries s
     JOIN workout_logs w ON w.id = s.workout_log_id WHERE s.id = ?`,
    setId,
  );
  if (!row?.uuid || !row.log_uuid) return;
  const exRef = await exerciseRefForId(row.exercise_id);
  await enqueueSync('set_entries', row.uuid, row.deleted_at ? 'delete' : 'upsert', {
    workout_log_uuid: row.log_uuid,
    exercise_ref: exRef,
    set_index: row.set_index,
    weight: row.weight,
    reps: row.reps,
    completed: row.completed,
    rest_seconds: row.rest_seconds,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  });
}

/** Calculate the muscle group distribution for a completed workout (by completed set count). */
export async function getWorkoutMuscleSplit(logId: number): Promise<MuscleSplit[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ primary_muscle: string; count: number }>(
    `SELECT e.primary_muscle, COUNT(s.id) as count
     FROM set_entries s
     JOIN exercises e ON e.id = s.exercise_id
     WHERE s.workout_log_id = ? AND s.completed = 1 AND s.deleted_at IS NULL
     GROUP BY e.primary_muscle
     ORDER BY count DESC`,
    logId,
  );
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (total === 0) return [];
  return rows.map((r) => ({
    muscle: r.primary_muscle as MuscleGroup,
    percentage: Math.round((r.count / total) * 100),
    sets: r.count,
  }));
}

export async function getActiveWorkout(): Promise<SessionWorkout | null> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<LogRow>(
    'SELECT * FROM workout_logs WHERE ended_at IS NULL AND deleted_at IS NULL ORDER BY started_at DESC LIMIT 1',
  );
  if (!log) return null;
  return { ...mapLog(log), sets: await getSessionSets(log.id) };
}

export async function getWorkoutLog(id: number): Promise<SessionWorkout | null> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<LogRow>(
    'SELECT * FROM workout_logs WHERE id = ? AND deleted_at IS NULL',
    id,
  );
  if (!log) return null;
  return { ...mapLog(log), sets: await getSessionSets(log.id) };
}

export async function getRestDefaultsForSession(logId: number): Promise<Record<number, number>> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<{ template_id: number | null }>(
    'SELECT template_id FROM workout_logs WHERE id = ?',
    logId,
  );
  const exRows = await db.getAllAsync<{ exercise_id: number }>(
    'SELECT DISTINCT exercise_id FROM set_entries WHERE workout_log_id = ? AND deleted_at IS NULL',
    logId,
  );
  const ids = exRows.map((e) => e.exercise_id);
  if (ids.length === 0) return {};
  const map: Record<number, number> = {};
  if (log?.template_id != null) {
    const teRows = await db.getAllAsync<{ exercise_id: number; rest_seconds: number }>(
      'SELECT exercise_id, rest_seconds FROM template_exercises WHERE template_id = ? AND deleted_at IS NULL',
      log.template_id,
    );
    for (const te of teRows) map[te.exercise_id] = te.rest_seconds;
  }
  const placeholders = ids.map(() => '?').join(',');
  const exDefaults = await db.getAllAsync<{ id: number; default_rest_seconds: number }>(
    `SELECT id, default_rest_seconds FROM exercises WHERE id IN (${placeholders})`,
    ...ids,
  );
  for (const ex of exDefaults) {
    if (map[ex.id] === undefined) map[ex.id] = ex.default_rest_seconds;
  }
  return map;
}

export async function startWorkout(templateId: number | null, name: string): Promise<number> {
  const db = await openDatabase();
  const now = Date.now();
  const logUuid = newUuid();
  let logId = 0;
  const setIds: number[] = [];
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO workout_logs (template_id, name, started_at, ended_at, duration_seconds, total_volume, unit, notes, uuid, created_at, updated_at) VALUES (?, ?, ?, NULL, 0, 0, 'metric', '', ?, ?, ?)`,
      templateId, name, now, logUuid, now, now,
    );
    logId = res.lastInsertRowId as number;
    if (templateId != null) {
      const teRows = await db.getAllAsync<TemplateExerciseRow>(
        'SELECT * FROM template_exercises WHERE template_id = ? AND deleted_at IS NULL ORDER BY sort_order',
        templateId,
      );
      for (const te of teRows) {
        const last = await getLastSetsForExercise(te.exercise_id);
        for (let s = 0; s < te.target_sets; s++) {
          const setRes = await db.runAsync(
            `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, uuid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
            logId, te.exercise_id, s, last[s]?.weight ?? 0, last[s]?.reps ?? te.target_reps_min, newUuid(), now, now,
          );
          setIds.push(setRes.lastInsertRowId as number);
        }
      }
    }
  });
  await enqueueLogUpsert(logId);
  for (const setId of setIds) await enqueueSetUpsert(setId);
  return logId;
}

export async function addExerciseToWorkout(logId: number, exerciseId: number): Promise<number> {
  const db = await openDatabase();
  const now = Date.now();
  const last = await getLastSetsForExercise(exerciseId);
  const existing = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM set_entries WHERE workout_log_id = ? AND exercise_id = ? AND deleted_at IS NULL',
    logId, exerciseId,
  );
  const setIndex = existing?.c ?? 0;
  const res = await db.runAsync(
    `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, uuid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
    logId, exerciseId, setIndex, last[0]?.weight ?? 0, last[0]?.reps ?? 0, newUuid(), now, now,
  );
  const setId = res.lastInsertRowId as number;
  await recomputeVolume(logId);
  await enqueueSetUpsert(setId);
  await enqueueLogUpsert(logId);
  return setId;
}

export async function addWarmUpSet(logId: number, exerciseId: number): Promise<number> {
  const db = await openDatabase();
  const now = Date.now();
  const heaviest = await db.getFirstAsync<SetRow>(
    'SELECT * FROM set_entries WHERE workout_log_id = ? AND exercise_id = ? AND deleted_at IS NULL ORDER BY weight DESC LIMIT 1',
    logId, exerciseId,
  );
  const last = await db.getFirstAsync<SetRow>(
    'SELECT * FROM set_entries WHERE workout_log_id = ? AND exercise_id = ? AND deleted_at IS NULL ORDER BY set_index DESC LIMIT 1',
    logId, exerciseId,
  );
  const workingWeight = heaviest?.weight ?? 0;
  const warmUpWeight = Math.max(0, Math.round((workingWeight * 0.5) / 2.5) * 2.5);
  const nextIndex = last ? last.set_index + 1 : 0;
  const res = await db.runAsync(
    `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, uuid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
    logId, exerciseId, nextIndex, warmUpWeight, heaviest?.reps ?? 10, newUuid(), now, now,
  );
  const setId = res.lastInsertRowId as number;
  await recomputeVolume(logId);
  await enqueueSetUpsert(setId);
  await enqueueLogUpsert(logId);
  return setId;
}

export async function addSet(logId: number, exerciseId: number): Promise<number> {
  const db = await openDatabase();
  const now = Date.now();
  const rows = await db.getAllAsync<SetRow>(
    'SELECT * FROM set_entries WHERE workout_log_id = ? AND exercise_id = ? AND deleted_at IS NULL ORDER BY set_index DESC LIMIT 1',
    logId, exerciseId,
  );
  const last = rows[0];
  const nextIndex = last ? last.set_index + 1 : 0;
  const res = await db.runAsync(
    `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, uuid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
    logId, exerciseId, nextIndex, last?.weight ?? 0, last?.reps ?? 0, newUuid(), now, now,
  );
  const setId = res.lastInsertRowId as number;
  await recomputeVolume(logId);
  await enqueueSetUpsert(setId);
  await enqueueLogUpsert(logId);
  return setId;
}

export interface SetPatch {
  weight?: number;
  reps?: number;
  completed?: boolean;
  restSeconds?: number | null;
}

export async function updateSet(setId: number, patch: SetPatch): Promise<void> {
  const db = await openDatabase();
  const sets: string[] = [];
  const args: (number | null)[] = [];
  if (patch.weight !== undefined) { sets.push('weight = ?'); args.push(patch.weight); }
  if (patch.reps !== undefined) { sets.push('reps = ?'); args.push(patch.reps); }
  if (patch.completed !== undefined) { sets.push('completed = ?'); args.push(patch.completed ? 1 : 0); }
  if (patch.restSeconds !== undefined) { sets.push('rest_seconds = ?'); args.push(patch.restSeconds); }
  if (sets.length === 0) return;
  const now = Date.now();
  sets.push('updated_at = ?');
  args.push(now);
  args.push(setId);
  await db.runAsync(`UPDATE set_entries SET ${sets.join(', ')} WHERE id = ?`, ...args);
  const row = await db.getFirstAsync<{ workout_log_id: number }>('SELECT workout_log_id FROM set_entries WHERE id = ?', setId);
  if (row) {
    await recomputeVolume(row.workout_log_id);
    await enqueueLogUpsert(row.workout_log_id);
  }
  await enqueueSetUpsert(setId);
}

export async function removeSet(setId: number): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  const row = await db.getFirstAsync<{ workout_log_id: number; uuid: string | null }>(
    'SELECT workout_log_id, uuid FROM set_entries WHERE id = ?',
    setId,
  );
  await db.runAsync(
    'UPDATE set_entries SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now, now, setId,
  );
  if (row) {
    await recomputeVolume(row.workout_log_id);
    await enqueueSetUpsert(setId);
    await enqueueLogUpsert(row.workout_log_id);
  }
}

export async function updateWorkoutNotes(logId: number, notes: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('UPDATE workout_logs SET notes = ?, updated_at = ? WHERE id = ?', notes, Date.now(), logId);
  await enqueueLogUpsert(logId);
}

export async function updateWorkoutLogStartedAt(logId: number, startedAt: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('UPDATE workout_logs SET started_at = ?, updated_at = ? WHERE id = ?', startedAt, Date.now(), logId);
  await enqueueLogUpsert(logId);
}

export async function updateWorkoutDuration(logId: number, seconds: number): Promise<void> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<LogRow>('SELECT started_at FROM workout_logs WHERE id = ?', logId);
  if (!log) return;
  await db.runAsync(
    'UPDATE workout_logs SET duration_seconds = ?, ended_at = ?, updated_at = ? WHERE id = ?',
    seconds, log.started_at + seconds * 1000, Date.now(), logId,
  );
  await enqueueLogUpsert(logId);
}

export async function finishWorkout(logId: number, options?: { pausedMs?: number }): Promise<void> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<LogRow>('SELECT * FROM workout_logs WHERE id = ?', logId);
  if (!log) return;
  const now = Date.now();
  const pausedMs = Math.max(0, options?.pausedMs ?? 0);
  const duration = Math.max(0, Math.floor((now - log.started_at - pausedMs) / 1000));

  // Soft-delete incomplete template sets so Home/history only show what was logged.
  // Templates themselves are untouched.
  const incomplete = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM set_entries
     WHERE workout_log_id = ? AND completed = 0 AND deleted_at IS NULL`,
    logId,
  );
  for (const row of incomplete) {
    await db.runAsync(
      'UPDATE set_entries SET deleted_at = ?, updated_at = ? WHERE id = ?',
      now, now, row.id,
    );
  }

  await recomputeVolume(logId);
  await db.runAsync(
    'UPDATE workout_logs SET ended_at = ?, duration_seconds = ?, updated_at = ? WHERE id = ?',
    now, duration, now, logId,
  );
  for (const row of incomplete) await enqueueSetUpsert(row.id);
  await enqueueLogUpsert(logId);
}

/** Undo a soft-deleted set within the same session (preserves uuid for sync). */
export async function restoreSet(setId: number): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  const row = await db.getFirstAsync<{ workout_log_id: number }>(
    'SELECT workout_log_id FROM set_entries WHERE id = ?',
    setId,
  );
  if (!row) return;
  await db.runAsync(
    'UPDATE set_entries SET deleted_at = NULL, updated_at = ? WHERE id = ?',
    now, setId,
  );
  await recomputeVolume(row.workout_log_id);
  await enqueueSetUpsert(setId);
  await enqueueLogUpsert(row.workout_log_id);
}

export async function discardWorkout(logId: number): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  const sets = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM set_entries WHERE workout_log_id = ? AND deleted_at IS NULL',
    logId,
  );
  await db.runAsync(
    'UPDATE set_entries SET deleted_at = ?, updated_at = ? WHERE workout_log_id = ? AND deleted_at IS NULL',
    now, now, logId,
  );
  await db.runAsync(
    'UPDATE workout_logs SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now, now, logId,
  );
  for (const s of sets) await enqueueSetUpsert(s.id);
  await enqueueLogUpsert(logId);
}

export async function listWorkoutLogs(offset = 0, limit = PAGINATION.pageSize): Promise<Paginated<WorkoutLog>> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<LogRow>(
    'SELECT * FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL ORDER BY started_at DESC LIMIT ? OFFSET ?',
    limit,
    offset,
  );
  const items = rows.map(mapLog);
  const nextOffset = items.length === limit ? offset + limit : null;
  return { items, nextOffset };
}

export async function listWorkoutFeedLogs(offset = 0, limit = PAGINATION.pageSize): Promise<Paginated<FeedWorkoutLog>> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<LogRow>(
    'SELECT * FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL ORDER BY started_at DESC LIMIT ? OFFSET ?',
    limit,
    offset,
  );
  if (rows.length === 0) return { items: [], nextOffset: null };
  const items = await enrichWorkoutFeed(db, rows);
  const nextOffset = items.length === limit ? offset + limit : null;
  return { items, nextOffset };
}

export async function getWorkoutFeedForDay(dayMs: number): Promise<FeedWorkoutLog[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<LogRow>(
    `SELECT * FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL AND started_at >= ? AND started_at < ? ORDER BY started_at DESC`,
    dayMs, dayMs + 86_400_000,
  );
  if (rows.length === 0) return [];
  return enrichWorkoutFeed(db, rows);
}

async function enrichWorkoutFeed(db: SQLiteDatabase, rows: LogRow[]): Promise<FeedWorkoutLog[]> {
  const logIds = rows.map((r) => r.id);
  const placeholders = logIds.map(() => '?').join(',');

  const allSets = await db.getAllAsync<SetRow & { exercise_name: string }>(
    `SELECT s.*, e.name as exercise_name FROM set_entries s
     JOIN exercises e ON e.id = s.exercise_id
     WHERE s.workout_log_id IN (${placeholders}) AND s.deleted_at IS NULL AND s.completed = 1
     ORDER BY s.workout_log_id, s.exercise_id, s.set_index`,
    ...logIds,
  );

  const exerciseIds = [...new Set(allSets.map((s) => s.exercise_id))];
  const imgPlaceholders = exerciseIds.map(() => '?').join(',');
  const imgRows = exerciseIds.length > 0
    ? await db.getAllAsync<{ exercise_id: number; url: string }>(
        `SELECT exercise_id, url FROM exercise_images WHERE exercise_id IN (${imgPlaceholders}) AND is_primary = 1`,
        ...exerciseIds,
      )
    : [];
  const imgMap = new Map<number, string>();
  for (const r of imgRows) imgMap.set(r.exercise_id, r.url);

  const exerciseMap = new Map<number, Map<number, { exerciseId: number; exerciseName: string; setCount: number; imageUrl: string | null }>>();
  for (const s of allSets) {
    if (!exerciseMap.has(s.workout_log_id)) exerciseMap.set(s.workout_log_id, new Map());
    const exMap = exerciseMap.get(s.workout_log_id)!;
    const existing = exMap.get(s.exercise_id);
    if (existing) {
      existing.setCount++;
    } else {
      exMap.set(s.exercise_id, {
        exerciseId: s.exercise_id,
        exerciseName: s.exercise_name,
        setCount: 1,
        imageUrl: imgMap.get(s.exercise_id) ?? null,
      });
    }
  }

  const prCounts = new Map<number, number>();
  for (const logId of logIds) prCounts.set(logId, 0);

  const bestWeights = await db.getAllAsync<{ exercise_id: number; max_weight: number }>(
    `SELECT exercise_id, MAX(weight) as max_weight FROM set_entries
     WHERE completed = 1 AND deleted_at IS NULL GROUP BY exercise_id`,
  );
  const bestWeightMap = new Map<number, number>();
  for (const bw of bestWeights) bestWeightMap.set(bw.exercise_id, bw.max_weight);

  for (const logId of logIds) {
    const logSets = allSets.filter((s) => s.workout_log_id === logId && s.completed);
    const exerciseMaxWeights = new Map<number, number>();
    for (const s of logSets) {
      const prev = exerciseMaxWeights.get(s.exercise_id) ?? 0;
      if (s.weight > prev) exerciseMaxWeights.set(s.exercise_id, s.weight);
    }
    let prCount = 0;
    for (const [exId, maxW] of exerciseMaxWeights) {
      if (bestWeightMap.get(exId) === maxW && maxW > 0) prCount++;
    }
    prCounts.set(logId, prCount);
  }

  return rows.map((r) => {
    const log = mapLog(r);
    const exMap = exerciseMap.get(r.id);
    return {
      ...log,
      exercises: exMap ? [...exMap.values()] : [],
      prCount: prCounts.get(r.id) ?? 0,
    };
  });
}

/** Count exercises in this finished session that match the all-time heaviest weight. */
export async function getWorkoutPrCount(logId: number): Promise<number> {
  const db = await openDatabase();
  const logSets = await db.getAllAsync<{ exercise_id: number; weight: number }>(
    `SELECT exercise_id, weight FROM set_entries
     WHERE workout_log_id = ? AND completed = 1 AND deleted_at IS NULL`,
    logId,
  );
  if (logSets.length === 0) return 0;
  const exerciseMax = new Map<number, number>();
  for (const s of logSets) {
    const prev = exerciseMax.get(s.exercise_id) ?? 0;
    if (s.weight > prev) exerciseMax.set(s.exercise_id, s.weight);
  }
  let count = 0;
  for (const [exId, maxW] of exerciseMax) {
    if (maxW <= 0) continue;
    const best = await db.getFirstAsync<{ max_weight: number }>(
      `SELECT MAX(s.weight) as max_weight FROM set_entries s
       JOIN workout_logs w ON w.id = s.workout_log_id
       WHERE s.exercise_id = ? AND s.completed = 1 AND s.deleted_at IS NULL
         AND w.ended_at IS NOT NULL AND w.deleted_at IS NULL`,
      exId,
    );
    if ((best?.max_weight ?? 0) === maxW) count++;
  }
  return count;
}

export async function deleteWorkout(logId: number): Promise<void> {
  await discardWorkout(logId);
}

export async function clearWorkoutHistory(): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  const logs = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM workout_logs WHERE deleted_at IS NULL',
  );
  for (const log of logs) {
    await discardWorkout(log.id);
  }
  // Touch timestamp if somehow empty
  void now;
}
