import { openDatabase } from '../client';
import { PAGINATION } from '@/constants/config';
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
}

/** Calculate the muscle group distribution for a completed workout (by completed set count). */
export async function getWorkoutMuscleSplit(logId: number): Promise<MuscleSplit[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ primary_muscle: string; count: number }>(
    `SELECT e.primary_muscle, COUNT(s.id) as count
     FROM set_entries s
     JOIN exercises e ON e.id = s.exercise_id
     WHERE s.workout_log_id = ? AND s.completed = 1
     GROUP BY e.primary_muscle
     ORDER BY count DESC`,
    logId,
  );
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (total === 0) return [];
  return rows.map((r) => ({
    muscle: r.primary_muscle as MuscleGroup,
    percentage: Math.round((r.count / total) * 100),
  }));
}

export async function getActiveWorkout(): Promise<SessionWorkout | null> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<LogRow>('SELECT * FROM workout_logs WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1');
  if (!log) return null;
  return { ...mapLog(log), sets: await getSessionSets(log.id) };
}

export async function getWorkoutLog(id: number): Promise<SessionWorkout | null> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<LogRow>('SELECT * FROM workout_logs WHERE id = ?', id);
  if (!log) return null;
  return { ...mapLog(log), sets: await getSessionSets(log.id) };
}

/**
 * Default rest seconds for each exercise in a session, keyed by exercise id.
 * Prefers the workout template's configured rest; falls back to the exercise's
 * own default. Used to pre-fill the per-exercise rest timer at session start.
 */
export async function getRestDefaultsForSession(logId: number): Promise<Record<number, number>> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<{ template_id: number | null }>('SELECT template_id FROM workout_logs WHERE id = ?', logId);
  const exRows = await db.getAllAsync<{ exercise_id: number }>('SELECT DISTINCT exercise_id FROM set_entries WHERE workout_log_id = ?', logId);
  const ids = exRows.map((e) => e.exercise_id);
  if (ids.length === 0) return {};
  const map: Record<number, number> = {};
  if (log?.template_id != null) {
    const teRows = await db.getAllAsync<{ exercise_id: number; rest_seconds: number }>(
      'SELECT exercise_id, rest_seconds FROM template_exercises WHERE template_id = ?',
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

/** Start a new session. Pre-fills set rows from the template, carrying over the
 * most recent values logged for each exercise. Returns the new workout_log id. */
export async function startWorkout(templateId: number | null, name: string): Promise<number> {
  const db = await openDatabase();
  const now = Date.now();
  let logId = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO workout_logs (template_id, name, started_at, ended_at, duration_seconds, total_volume, unit, notes, created_at, updated_at) VALUES (?, ?, ?, NULL, 0, 0, 'metric', '', ?, ?)`,
      templateId, name, now, now, now,
    );
    logId = res.lastInsertRowId as number;
    if (templateId != null) {
      const teRows = await db.getAllAsync<TemplateExerciseRow>('SELECT * FROM template_exercises WHERE template_id = ? ORDER BY sort_order', templateId);
      for (const te of teRows) {
        const last = await getLastSetsForExercise(te.exercise_id);
        for (let s = 0; s < te.target_sets; s++) {
          await db.runAsync(
            `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, created_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
            logId, te.exercise_id, s, last[s]?.weight ?? 0, last[s]?.reps ?? te.target_reps_min, now,
          );
        }
      }
    }
  });
  return logId;
}

/** Add a brand new exercise block to a session (with carry-over from history). */
export async function addExerciseToWorkout(logId: number, exerciseId: number): Promise<number> {
  const db = await openDatabase();
  const last = await getLastSetsForExercise(exerciseId);
  const existing = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM set_entries WHERE workout_log_id = ? AND exercise_id = ?', logId, exerciseId);
  const setIndex = existing?.c ?? 0;
  const res = await db.runAsync(
    `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, created_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
    logId, exerciseId, setIndex, last[0]?.weight ?? 0, last[0]?.reps ?? 0, Date.now(),
  );
  await recomputeVolume(logId);
  return res.lastInsertRowId as number;
}

/** Add a warm-up set at ~50% of the exercise's current working weight. */
export async function addWarmUpSet(logId: number, exerciseId: number): Promise<number> {
  const db = await openDatabase();
  const heaviest = await db.getFirstAsync<SetRow>(
    'SELECT * FROM set_entries WHERE workout_log_id = ? AND exercise_id = ? ORDER BY weight DESC LIMIT 1',
    logId,
    exerciseId,
  );
  const last = await db.getFirstAsync<SetRow>(
    'SELECT * FROM set_entries WHERE workout_log_id = ? AND exercise_id = ? ORDER BY set_index DESC LIMIT 1',
    logId,
    exerciseId,
  );
  const workingWeight = heaviest?.weight ?? 0;
  const warmUpWeight = Math.max(0, Math.round((workingWeight * 0.5) / 2.5) * 2.5);
  const nextIndex = last ? last.set_index + 1 : 0;
  const res = await db.runAsync(
    `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, created_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
    logId, exerciseId, nextIndex, warmUpWeight, heaviest?.reps ?? 10, Date.now(),
  );
  await recomputeVolume(logId);
  return res.lastInsertRowId as number;
}

/** Add a set to an existing exercise block, copying the last set's values. */
export async function addSet(logId: number, exerciseId: number): Promise<number> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<SetRow>('SELECT * FROM set_entries WHERE workout_log_id = ? AND exercise_id = ? ORDER BY set_index DESC LIMIT 1', logId, exerciseId);
  const last = rows[0];
  const nextIndex = last ? last.set_index + 1 : 0;
  const res = await db.runAsync(
    `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, created_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
    logId, exerciseId, nextIndex, last?.weight ?? 0, last?.reps ?? 0, Date.now(),
  );
  await recomputeVolume(logId);
  return res.lastInsertRowId as number;
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
  args.push(setId);
  await db.runAsync(`UPDATE set_entries SET ${sets.join(', ')} WHERE id = ?`, ...args);
  const row = await db.getFirstAsync<{ workout_log_id: number }>('SELECT workout_log_id FROM set_entries WHERE id = ?', setId);
  if (row) await recomputeVolume(row.workout_log_id);
}

export async function removeSet(setId: number): Promise<void> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ workout_log_id: number }>('SELECT workout_log_id FROM set_entries WHERE id = ?', setId);
  await db.runAsync('DELETE FROM set_entries WHERE id = ?', setId);
  if (row) await recomputeVolume(row.workout_log_id);
}

export async function updateWorkoutNotes(logId: number, notes: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('UPDATE workout_logs SET notes = ?, updated_at = ? WHERE id = ?', notes, Date.now(), logId);
}

export async function updateWorkoutLogStartedAt(logId: number, startedAt: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('UPDATE workout_logs SET started_at = ?, updated_at = ? WHERE id = ?', startedAt, Date.now(), logId);
}

export async function updateWorkoutDuration(logId: number, seconds: number): Promise<void> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<LogRow>('SELECT started_at FROM workout_logs WHERE id = ?', logId);
  if (!log) return;
  await db.runAsync(
    'UPDATE workout_logs SET duration_seconds = ?, ended_at = ?, updated_at = ? WHERE id = ?',
    seconds, log.started_at + seconds * 1000, Date.now(), logId,
  );
}

export async function finishWorkout(logId: number): Promise<void> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<LogRow>('SELECT * FROM workout_logs WHERE id = ?', logId);
  if (!log) return;
  const now = Date.now();
  const duration = Math.max(0, now - log.started_at);
  await recomputeVolume(logId);
  await db.runAsync('UPDATE workout_logs SET ended_at = ?, duration_seconds = ?, updated_at = ? WHERE id = ?', now, duration, now, logId);
}

export async function discardWorkout(logId: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM workout_logs WHERE id = ?', logId);
}

export async function listWorkoutLogs(offset = 0, limit = PAGINATION.pageSize): Promise<Paginated<WorkoutLog>> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<LogRow>(
    'SELECT * FROM workout_logs WHERE ended_at IS NOT NULL ORDER BY started_at DESC LIMIT ? OFFSET ?',
    limit,
    offset,
  );
  const items = rows.map(mapLog);
  const nextOffset = items.length === limit ? offset + limit : null;
  return { items, nextOffset };
}

/** Enriched workout logs for the home feed: includes exercise summaries and PR count. */
export async function listWorkoutFeedLogs(offset = 0, limit = PAGINATION.pageSize): Promise<Paginated<FeedWorkoutLog>> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<LogRow>(
    'SELECT * FROM workout_logs WHERE ended_at IS NOT NULL ORDER BY started_at DESC LIMIT ? OFFSET ?',
    limit,
    offset,
  );
  if (rows.length === 0) return { items: [], nextOffset: null };
  const items = await enrichWorkoutFeed(db, rows);
  const nextOffset = items.length === limit ? offset + limit : null;
  return { items, nextOffset };
}

/** Enriched completed workouts for a single day (day-start in ms), newest first. */
export async function getWorkoutFeedForDay(dayMs: number): Promise<FeedWorkoutLog[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<LogRow>(
    `SELECT * FROM workout_logs WHERE ended_at IS NOT NULL AND started_at >= ? AND started_at < ? ORDER BY started_at DESC`,
    dayMs, dayMs + 86_400_000,
  );
  if (rows.length === 0) return [];
  return enrichWorkoutFeed(db, rows);
}

/** Batch-load sets, images, and PR counts for a set of completed workout logs. */
async function enrichWorkoutFeed(db: SQLiteDatabase, rows: LogRow[]): Promise<FeedWorkoutLog[]> {
  const logIds = rows.map((r) => r.id);
  const placeholders = logIds.map(() => '?').join(',');

  // Batch-load all sets for these logs
  const allSets = await db.getAllAsync<SetRow & { exercise_name: string }>(
    `SELECT s.*, e.name as exercise_name FROM set_entries s
     JOIN exercises e ON e.id = s.exercise_id
     WHERE s.workout_log_id IN (${placeholders})
     ORDER BY s.workout_log_id, s.exercise_id, s.set_index`,
    ...logIds,
  );

  // Batch-load primary images for all exercises referenced
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

  // Build per-log exercise summaries
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

  // Count PRs per log: for each completed set, check if it's the best ever for that exercise
  const prCounts = new Map<number, number>();
  for (const logId of logIds) {
    prCounts.set(logId, 0);
  }
  // Get best weight per exercise across all time
  const bestWeights = await db.getAllAsync<{ exercise_id: number; max_weight: number }>(
    `SELECT exercise_id, MAX(weight) as max_weight FROM set_entries
     WHERE completed = 1 GROUP BY exercise_id`,
  );
  const bestWeightMap = new Map<number, number>();
  for (const bw of bestWeights) bestWeightMap.set(bw.exercise_id, bw.max_weight);

  // For each log, count exercises where max weight equals all-time max
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

export async function deleteWorkout(logId: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM workout_logs WHERE id = ?', logId);
}

export async function clearWorkoutHistory(): Promise<void> {
  const db = await openDatabase();
  await db.execAsync('DELETE FROM workout_logs');
}
