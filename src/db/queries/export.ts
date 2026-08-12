import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { openDatabase } from '../client';
import {
  buildExportJson,
  buildSetsCsv,
  rangeStartMs,
  stampFilename,
  type ExportPayload,
  type ExportRange,
  type ExportSetRow,
  type ExportWorkoutJson,
} from '@/lib/export-data';

interface SetJoinRow {
  workout_id: number;
  workout_uuid: string | null;
  workout_name: string;
  started_at: number;
  ended_at: number | null;
  duration_seconds: number;
  total_volume: number;
  notes: string;
  exercise_id: number;
  exercise_name: string;
  exercise_external_id: string | null;
  set_index: number;
  weight: number;
  reps: number;
  completed: number;
  rest_seconds: number | null;
}

async function loadExportSetRows(range: ExportRange): Promise<ExportSetRow[]> {
  const db = await openDatabase();
  const since = rangeStartMs(range);
  const rows = since == null
    ? await db.getAllAsync<SetJoinRow>(
        `SELECT
           w.id as workout_id, w.uuid as workout_uuid, w.name as workout_name,
           w.started_at, w.ended_at, w.duration_seconds, w.total_volume, w.notes,
           s.exercise_id, e.name as exercise_name, e.external_id as exercise_external_id,
           s.set_index, s.weight, s.reps, s.completed, s.rest_seconds
         FROM set_entries s
         JOIN workout_logs w ON w.id = s.workout_log_id
         JOIN exercises e ON e.id = s.exercise_id
         WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL
         ORDER BY w.started_at ASC, s.exercise_id ASC, s.set_index ASC`,
      )
    : await db.getAllAsync<SetJoinRow>(
        `SELECT
           w.id as workout_id, w.uuid as workout_uuid, w.name as workout_name,
           w.started_at, w.ended_at, w.duration_seconds, w.total_volume, w.notes,
           s.exercise_id, e.name as exercise_name, e.external_id as exercise_external_id,
           s.set_index, s.weight, s.reps, s.completed, s.rest_seconds
         FROM set_entries s
         JOIN workout_logs w ON w.id = s.workout_log_id
         JOIN exercises e ON e.id = s.exercise_id
         WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL
           AND w.started_at >= ?
         ORDER BY w.started_at ASC, s.exercise_id ASC, s.set_index ASC`,
        since,
      );

  return rows.map((r) => ({
    workoutId: r.workout_id,
    workoutUuid: r.workout_uuid,
    workoutName: r.workout_name,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    durationSeconds: r.duration_seconds,
    totalVolume: r.total_volume,
    notes: r.notes ?? '',
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    exerciseExternalId: r.exercise_external_id,
    setIndex: r.set_index,
    weight: r.weight,
    reps: r.reps,
    completed: r.completed === 1,
    restSeconds: r.rest_seconds,
  }));
}

function groupWorkouts(rows: ExportSetRow[]): ExportWorkoutJson[] {
  const map = new Map<number, ExportWorkoutJson>();
  for (const r of rows) {
    let w = map.get(r.workoutId);
    if (!w) {
      w = {
        id: r.workoutId,
        uuid: r.workoutUuid,
        name: r.workoutName,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        durationSeconds: r.durationSeconds,
        totalVolume: r.totalVolume,
        notes: r.notes,
        sets: [],
      };
      map.set(r.workoutId, w);
    }
    w.sets.push({
      exerciseId: r.exerciseId,
      exerciseName: r.exerciseName,
      exerciseExternalId: r.exerciseExternalId,
      setIndex: r.setIndex,
      weight: r.weight,
      reps: r.reps,
      completed: r.completed,
      restSeconds: r.restSeconds,
    });
  }
  return [...map.values()];
}

async function buildJsonPayload(range: ExportRange, rows: ExportSetRow[]): Promise<ExportPayload> {
  const db = await openDatabase();
  const profile = await db.getFirstAsync<{ name: string; unit: string; goal: string | null }>(
    'SELECT name, unit, goal FROM user_profile WHERE id = 1',
  );
  const customExercises = await db.getAllAsync<{
    id: number;
    uuid: string | null;
    name: string;
    primary_muscle: string;
    equipment: string;
    external_id: string | null;
  }>(
    `SELECT id, uuid, name, primary_muscle, equipment, external_id
     FROM exercises WHERE is_custom = 1 AND deleted_at IS NULL ORDER BY name`,
  );
  const bodyweight = await db.getAllAsync<{
    id: number;
    weight: number;
    unit: string;
    recorded_at: number;
  }>('SELECT id, weight, unit, recorded_at FROM bodyweight_entries WHERE deleted_at IS NULL ORDER BY recorded_at ASC');
  const bodyMeasurements = await db.getAllAsync<{
    id: number;
    metric: string;
    value: number;
    unit: string;
    recorded_at: number;
  }>(
    'SELECT id, metric, value, unit, recorded_at FROM body_measurements WHERE deleted_at IS NULL ORDER BY recorded_at ASC',
  );

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    app: 'incline',
    range,
    profile: profile
      ? { name: profile.name, unit: profile.unit, goal: profile.goal }
      : null,
    workouts: groupWorkouts(rows),
    customExercises: customExercises.map((e) => ({
      id: e.id,
      uuid: e.uuid,
      name: e.name,
      primaryMuscle: e.primary_muscle,
      equipment: e.equipment,
      externalId: e.external_id,
    })),
    bodyweight: bodyweight.map((b) => ({
      id: b.id,
      weight: b.weight,
      unit: b.unit,
      recordedAt: b.recorded_at,
    })),
    bodyMeasurements: bodyMeasurements.map((m) => ({
      id: m.id,
      metric: m.metric,
      value: m.value,
      unit: m.unit,
      recordedAt: m.recorded_at,
    })),
  };
}

async function writeAndShare(contents: string, filename: string, mimeType: string): Promise<void> {
  const dir = cacheDirectory;
  if (!dir) throw new Error('No cache directory available');
  const uri = `${dir}${filename}`;
  await writeAsStringAsync(uri, contents, { encoding: 'utf8' });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: 'Export workout data',
    UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json',
  });
}

/** Build set-level CSV and open the system share sheet. */
export async function shareWorkoutCsv(range: ExportRange = 'all'): Promise<{ rowCount: number; shared: boolean }> {
  const rows = await loadExportSetRows(range);
  if (rows.length === 0) return { rowCount: 0, shared: false };
  const csv = buildSetsCsv(rows);
  await writeAndShare(csv, stampFilename('incline-workouts', 'csv'), 'text/csv');
  return { rowCount: rows.length, shared: true };
}

/** Build full JSON backup and open the system share sheet. */
export async function shareWorkoutJson(
  range: ExportRange = 'all',
): Promise<{ workoutCount: number; shared: boolean }> {
  const rows = await loadExportSetRows(range);
  const payload = await buildJsonPayload(range, rows);
  if (payload.workouts.length === 0 && payload.customExercises.length === 0 && payload.bodyweight.length === 0 && payload.bodyMeasurements.length === 0) {
    return { workoutCount: 0, shared: false };
  }
  const json = buildExportJson(payload);
  await writeAndShare(json, stampFilename('incline-backup', 'json'), 'application/json');
  return { workoutCount: payload.workouts.length, shared: true };
}
