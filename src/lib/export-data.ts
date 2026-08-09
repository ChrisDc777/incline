/**
 * Pure CSV/JSON builders for workout export (#6).
 * DB gathering lives in `src/db/queries/export.ts`.
 */

export type ExportRange = 'all' | '30d' | '90d' | '365d';

export interface ExportSetRow {
  workoutId: number;
  workoutUuid: string | null;
  workoutName: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  totalVolume: number;
  notes: string;
  exerciseId: number;
  exerciseName: string;
  exerciseExternalId: string | null;
  setIndex: number;
  weight: number;
  reps: number;
  completed: boolean;
  restSeconds: number | null;
}

export interface ExportWorkoutJson {
  id: number;
  uuid: string | null;
  name: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  totalVolume: number;
  notes: string;
  sets: {
    exerciseId: number;
    exerciseName: string;
    exerciseExternalId: string | null;
    setIndex: number;
    weight: number;
    reps: number;
    completed: boolean;
    restSeconds: number | null;
  }[];
}

export interface ExportPayload {
  exportedAt: string;
  version: 1;
  app: 'incline';
  range: ExportRange;
  profile: {
    name: string;
    unit: string;
    goal: string | null;
  } | null;
  workouts: ExportWorkoutJson[];
  customExercises: {
    id: number;
    uuid: string | null;
    name: string;
    primaryMuscle: string;
    equipment: string;
    externalId: string | null;
  }[];
  bodyweight: {
    id: number;
    weight: number;
    unit: string;
    recordedAt: number;
  }[];
}

export function rangeStartMs(range: ExportRange, now = Date.now()): number | null {
  if (range === 'all') return null;
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 365;
  return now - days * 86_400_000;
}

export function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  const s = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_HEADERS = [
  'workout_id',
  'workout_uuid',
  'workout_name',
  'started_at_iso',
  'ended_at_iso',
  'duration_seconds',
  'total_volume',
  'workout_notes',
  'exercise_id',
  'exercise_name',
  'exercise_external_id',
  'set_index',
  'weight',
  'reps',
  'completed',
  'rest_seconds',
] as const;

export function buildSetsCsv(rows: ExportSetRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.workoutId),
        csvEscape(r.workoutUuid),
        csvEscape(r.workoutName),
        csvEscape(new Date(r.startedAt).toISOString()),
        csvEscape(r.endedAt != null ? new Date(r.endedAt).toISOString() : ''),
        csvEscape(r.durationSeconds),
        csvEscape(r.totalVolume),
        csvEscape(r.notes),
        csvEscape(r.exerciseId),
        csvEscape(r.exerciseName),
        csvEscape(r.exerciseExternalId),
        csvEscape(r.setIndex),
        csvEscape(r.weight),
        csvEscape(r.reps),
        csvEscape(r.completed),
        csvEscape(r.restSeconds),
      ].join(','),
    );
  }
  return lines.join('\n');
}

export function buildExportJson(payload: ExportPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function stampFilename(prefix: string, ext: 'csv' | 'json', at = new Date()): string {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, '0');
  const d = String(at.getDate()).padStart(2, '0');
  return `${prefix}-${y}${m}${d}.${ext}`;
}
