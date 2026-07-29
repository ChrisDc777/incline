import { openDatabase } from './client';
import { estimated1RM, isoDate, startOfWeek } from './calc';
import { PAGINATION } from '@/constants/config';
import type {
  Category,
  Difficulty,
  Equipment,
  Exercise,
  ExerciseHistoryRow,
  Goal,
  MovementPattern,
  MuscleDistribution,
  MuscleGroup,
  Paginated,
  PR,
  ProgressStats,
  Program,
  ProgramWorkout,
  SearchHit,
  SetEntry,
  TemplateExercise,
  Unit,
  UserProfile,
  WeeklyVolume,
  WorkoutLog,
  WorkoutTemplate,
} from './types';

/* ------------------------------- row types ------------------------------- */
interface ExerciseRow {
  id: number;
  name: string;
  primary_muscle: string;
  movement_pattern: string;
  equipment: string;
  category: string;
  is_compound: number;
  tips: string;
  created_at: number;
  updated_at: number;
}
interface AliasRow { alias: string }
interface MuscleRow { muscle: string }
interface InstructionRow { step: number; text: string }
interface TemplateRow {
  id: number;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  estimated_minutes: number;
  created_at: number;
  updated_at: number;
}
interface TemplateExerciseRow {
  id: number;
  template_id: number;
  exercise_id: number;
  sort_order: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  rest_seconds: number;
  notes: string;
}
interface ProgramRow { id: number; name: string; description: string; weeks: number; created_at: number; updated_at: number }
interface ProgramWorkoutRow { id: number; program_id: number; template_id: number; week: number; day: number; sort_order: number }
interface LogRow {
  id: number;
  template_id: number | null;
  name: string;
  started_at: number;
  ended_at: number | null;
  duration_seconds: number;
  total_volume: number;
  unit: string;
  notes: string;
  created_at: number;
  updated_at: number;
}
interface SetRow {
  id: number;
  workout_log_id: number;
  exercise_id: number;
  set_index: number;
  weight: number;
  reps: number;
  completed: number;
  rest_seconds: number | null;
  created_at: number;
}
interface ProfileRow { id: number; name: string; goal: string; bodyweight: number | null; unit: string; onboarding_completed: number; updated_at: number }

/* ------------------------------- session types ------------------------------- */
export interface SessionSet extends SetEntry {
  exerciseName: string;
}
export interface SessionWorkout extends WorkoutLog {
  sets: SessionSet[];
}

/* ------------------------------- helpers ------------------------------- */
type DB = Awaited<ReturnType<typeof openDatabase>>;

async function mapExercise(db: DB, row: ExerciseRow): Promise<Exercise> {
  const aliases = (await db.getAllAsync<AliasRow>('SELECT alias FROM exercise_aliases WHERE exercise_id = ? ORDER BY id', row.id)).map((r) => r.alias);
  const secondaryMuscles = (await db.getAllAsync<MuscleRow>('SELECT muscle FROM exercise_secondary_muscles WHERE exercise_id = ? ORDER BY id', row.id)).map((r) => r.muscle as MuscleGroup);
  const instructions = (await db.getAllAsync<InstructionRow>('SELECT step, text FROM exercise_instructions WHERE exercise_id = ? ORDER BY step', row.id)).map((r) => r.text);
  return {
    id: row.id,
    name: row.name,
    aliases,
    primaryMuscle: row.primary_muscle as MuscleGroup,
    secondaryMuscles,
    movementPattern: row.movement_pattern as MovementPattern,
    equipment: row.equipment as Equipment,
    category: row.category as Category,
    isCompound: !!row.is_compound,
    instructions,
    tips: row.tips,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSet(r: SetRow): SetEntry {
  return {
    id: r.id,
    workoutLogId: r.workout_log_id,
    exerciseId: r.exercise_id,
    setIndex: r.set_index,
    weight: r.weight,
    reps: r.reps,
    completed: !!r.completed,
    restSeconds: r.rest_seconds,
    createdAt: r.created_at,
  };
}

function mapLog(r: LogRow): WorkoutLog {
  return {
    id: r.id,
    templateId: r.template_id,
    name: r.name,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    durationSeconds: r.duration_seconds,
    totalVolume: r.total_volume,
    unit: r.unit as Unit,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isComplete: r.ended_at != null,
  };
}

function mapProfile(r: ProfileRow): UserProfile {
  return {
    id: r.id,
    name: r.name,
    goal: r.goal as Goal,
    bodyweight: r.bodyweight,
    unit: r.unit as Unit,
    onboardingCompleted: !!r.onboarding_completed,
    updatedAt: r.updated_at,
  };
}

function mapTemplate(t: TemplateRow, exercises: TemplateExercise[]): WorkoutTemplate {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    difficulty: t.difficulty as Difficulty,
    estimatedMinutes: t.estimated_minutes,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    exercises,
  };
}

function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return i === needle.length;
}

async function recomputeVolume(logId: number): Promise<void> {
  const db = await openDatabase();
  const r = await db.getFirstAsync<{ v: number }>(
    'SELECT COALESCE(SUM(weight * reps), 0) as v FROM set_entries WHERE workout_log_id = ? AND completed = 1',
    logId,
  );
  await db.runAsync('UPDATE workout_logs SET total_volume = ?, updated_at = ? WHERE id = ?', r?.v ?? 0, Date.now(), logId);
}

async function getSessionSets(logId: number): Promise<SessionSet[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<SetRow & { exercise_name: string }>(
    `SELECT s.*, e.name as exercise_name FROM set_entries s JOIN exercises e ON e.id = s.exercise_id WHERE s.workout_log_id = ? ORDER BY s.id, s.set_index`,
    logId,
  );
  return rows.map((r) => ({ ...mapSet(r), exerciseName: r.exercise_name }));
}

/* ------------------------------- exercises ------------------------------- */
export async function listExercises(): Promise<Exercise[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<ExerciseRow>('SELECT * FROM exercises ORDER BY name');
  return Promise.all(rows.map((r) => mapExercise(db, r)));
}

export async function getExercise(id: number): Promise<Exercise | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE id = ?', id);
  return row ? mapExercise(db, row) : null;
}

export interface ExerciseFilters {
  muscle?: MuscleGroup;
  equipment?: Equipment;
  pattern?: MovementPattern;
}

/**
 * Multi-attribute search with a deliberate ranking order:
 * exact name -> exact alias -> name prefix -> alias prefix -> name contains
 * -> alias contains -> muscle -> equipment -> movement pattern -> fuzzy.
 */
export async function searchExercises(query: string, filters?: ExerciseFilters): Promise<SearchHit[]> {
  const db = await openDatabase();
  const q = query.trim().toLowerCase();
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (filters?.muscle) { where.push('primary_muscle = ?'); args.push(filters.muscle); }
  if (filters?.equipment) { where.push('equipment = ?'); args.push(filters.equipment); }
  if (filters?.pattern) { where.push('movement_pattern = ?'); args.push(filters.pattern); }
  let sql = 'SELECT * FROM exercises';
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY name';
  const rows = await db.getAllAsync<ExerciseRow>(sql, ...args);
  const exercises = await Promise.all(rows.map((r) => mapExercise(db, r)));
  if (!q) return exercises.map((exercise) => ({ exercise, score: 0, matchedOn: 'name' as const }));

  const hits: SearchHit[] = [];
  for (const ex of exercises) {
    const name = ex.name.toLowerCase();
    const aliases = ex.aliases.map((a) => a.toLowerCase());
    const muscles = [ex.primaryMuscle, ...ex.secondaryMuscles];
    let score = 0;
    let matchedOn: SearchHit['matchedOn'] | null = null;
    if (name === q) { score = 100; matchedOn = 'name'; }
    else if (aliases.includes(q)) { score = 95; matchedOn = 'alias'; }
    else if (name.startsWith(q)) { score = 90; matchedOn = 'name'; }
    else if (aliases.some((a) => a.startsWith(q))) { score = 85; matchedOn = 'alias'; }
    else if (name.includes(q)) { score = 75; matchedOn = 'name'; }
    else if (aliases.some((a) => a.includes(q))) { score = 70; matchedOn = 'alias'; }
    else if (muscles.some((m) => m.includes(q))) { score = 50; matchedOn = 'muscle'; }
    else if (ex.equipment.includes(q)) { score = 40; matchedOn = 'equipment'; }
    else if (ex.movementPattern.includes(q) || ex.movementPattern.replace('_', ' ').includes(q)) { score = 30; matchedOn = 'pattern'; }
    else if (isSubsequence(q, name)) { score = 20; matchedOn = 'name'; }
    else if (aliases.some((a) => isSubsequence(q, a))) { score = 18; matchedOn = 'alias'; }
    if (matchedOn) hits.push({ exercise: ex, score, matchedOn });
  }
  hits.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
  return hits;
}

/* ------------------------------- templates ------------------------------- */
export async function listTemplates(): Promise<WorkoutTemplate[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<TemplateRow>('SELECT * FROM workout_templates ORDER BY name');
  return rows.map((t) => mapTemplate(t, []));
}

export async function getTemplate(id: number): Promise<WorkoutTemplate | null> {
  const db = await openDatabase();
  const t = await db.getFirstAsync<TemplateRow>('SELECT * FROM workout_templates WHERE id = ?', id);
  if (!t) return null;
  const teRows = await db.getAllAsync<TemplateExerciseRow>('SELECT * FROM template_exercises WHERE template_id = ? ORDER BY sort_order', id);
  const exercises: TemplateExercise[] = [];
  for (const te of teRows) {
    const exercise = await getExercise(te.exercise_id);
    exercises.push({
      id: te.id,
      templateId: te.template_id,
      exerciseId: te.exercise_id,
      sortOrder: te.sort_order,
      targetSets: te.target_sets,
      targetRepsMin: te.target_reps_min,
      targetRepsMax: te.target_reps_max,
      restSeconds: te.rest_seconds,
      notes: te.notes,
      exercise: exercise ?? undefined,
    });
  }
  return mapTemplate(t, exercises);
}

export interface TemplateSummary {
  template: WorkoutTemplate;
  exerciseCount: number;
  muscleFocus: MuscleGroup[];
}

export async function listTemplateSummaries(): Promise<TemplateSummary[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<TemplateRow>('SELECT * FROM workout_templates ORDER BY name');
  const out: TemplateSummary[] = [];
  for (const t of rows) {
    const countRow = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM template_exercises WHERE template_id = ?', t.id);
    const muscleRows = await db.getAllAsync<{ primary_muscle: string }>(
      'SELECT DISTINCT e.primary_muscle FROM template_exercises te JOIN exercises e ON e.id = te.exercise_id WHERE te.template_id = ?',
      t.id,
    );
    out.push({ template: mapTemplate(t, []), exerciseCount: countRow?.c ?? 0, muscleFocus: muscleRows.map((r) => r.primary_muscle as MuscleGroup) });
  }
  return out;
}

export async function getSuggestedTemplate(): Promise<WorkoutTemplate | null> {
  const db = await openDatabase();
  const last = await db.getFirstAsync<{ template_id: number | null }>(
    'SELECT template_id FROM workout_logs WHERE ended_at IS NOT NULL AND template_id IS NOT NULL ORDER BY started_at DESC LIMIT 1',
  );
  const ids = [1, 2, 3, 4, 5, 6];
  const next = last?.template_id ? ids[(ids.indexOf(last.template_id) + 1) % ids.length] : 1;
  return getTemplate(next);
}

/* ------------------------------- template CRUD ------------------------------- */

export async function createTemplate(name: string, description: string, difficulty: Difficulty): Promise<number> {
  const db = await openDatabase();
  const now = Date.now();
  const res = await db.runAsync(
    `INSERT INTO workout_templates (name, description, category, difficulty, estimated_minutes, created_at, updated_at) VALUES (?, ?, 'strength', ?, 45, ?, ?)`,
    name, description, difficulty, now, now,
  );
  return res.lastInsertRowId;
}

export async function updateTemplate(id: number, patch: Partial<Pick<WorkoutTemplate, 'name' | 'description' | 'difficulty'>>): Promise<void> {
  const db = await openDatabase();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); args.push(patch.name); }
  if (patch.description !== undefined) { sets.push('description = ?'); args.push(patch.description); }
  if (patch.difficulty !== undefined) { sets.push('difficulty = ?'); args.push(patch.difficulty); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(Date.now());
  args.push(id);
  await db.runAsync(`UPDATE workout_templates SET ${sets.join(', ')} WHERE id = ?`, ...args);
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM template_exercises WHERE template_id = ?', id);
  await db.runAsync('DELETE FROM workout_templates WHERE id = ?', id);
}

export async function addExerciseToTemplate(
  templateId: number,
  exerciseId: number,
  targetSets: number,
  targetRepsMin: number,
  targetRepsMax: number,
  restSeconds: number,
): Promise<number> {
  const db = await openDatabase();
  const maxOrder = await db.getFirstAsync<{ m: number }>('SELECT COALESCE(MAX(sort_order), -1) as m FROM template_exercises WHERE template_id = ?', templateId);
  const nextOrder = (maxOrder?.m ?? -1) + 1;
  const res = await db.runAsync(
    `INSERT INTO template_exercises (template_id, exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, rest_seconds, notes) VALUES (?, ?, ?, ?, ?, ?, ?, '')`,
    templateId, exerciseId, nextOrder, targetSets, targetRepsMin, targetRepsMax, restSeconds,
  );
  return res.lastInsertRowId;
}

export async function updateTemplateExercise(
  id: number,
  patch: Partial<Pick<TemplateExercise, 'targetSets' | 'targetRepsMin' | 'targetRepsMax' | 'restSeconds'>>,
): Promise<void> {
  const db = await openDatabase();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (patch.targetSets !== undefined) { sets.push('target_sets = ?'); args.push(patch.targetSets); }
  if (patch.targetRepsMin !== undefined) { sets.push('target_reps_min = ?'); args.push(patch.targetRepsMin); }
  if (patch.targetRepsMax !== undefined) { sets.push('target_reps_max = ?'); args.push(patch.targetRepsMax); }
  if (patch.restSeconds !== undefined) { sets.push('rest_seconds = ?'); args.push(patch.restSeconds); }
  if (sets.length === 0) return;
  args.push(id);
  await db.runAsync(`UPDATE template_exercises SET ${sets.join(', ')} WHERE id = ?`, ...args);
}

export async function removeTemplateExercise(id: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM template_exercises WHERE id = ?', id);
}

export async function reorderTemplateExercises(templateId: number, exerciseIds: number[]): Promise<void> {
  const db = await openDatabase();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < exerciseIds.length; i++) {
      await db.runAsync('UPDATE template_exercises SET sort_order = ? WHERE id = ? AND template_id = ?', i, exerciseIds[i], templateId);
    }
  });
}

/* ------------------------------- programs ------------------------------- */
export async function listPrograms(): Promise<Program[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<ProgramRow>('SELECT * FROM programs ORDER BY name');
  return rows.map((p) => ({ id: p.id, name: p.name, description: p.description, weeks: p.weeks, createdAt: p.created_at, updatedAt: p.updated_at }));
}

export async function getProgram(id: number): Promise<Program | null> {
  const db = await openDatabase();
  const p = await db.getFirstAsync<ProgramRow>('SELECT * FROM programs WHERE id = ?', id);
  if (!p) return null;
  const pwRows = await db.getAllAsync<ProgramWorkoutRow>('SELECT * FROM program_workouts WHERE program_id = ? ORDER BY week, day, sort_order', id);
  const workouts: ProgramWorkout[] = pwRows.map((r) => ({ id: r.id, programId: r.program_id, templateId: r.template_id, week: r.week, day: r.day, sortOrder: r.sort_order }));
  return { id: p.id, name: p.name, description: p.description, weeks: p.weeks, createdAt: p.created_at, updatedAt: p.updated_at, workouts };
}

/* ------------------------------- active workout / sets ------------------------------- */
/** Most recent completed sets for an exercise (used for carry-over values). */
export async function getLastSetsForExercise(exerciseId: number): Promise<SetEntry[]> {
  const db = await openDatabase();
  const log = await db.getFirstAsync<{ id: number }>(
    `SELECT w.id FROM workout_logs w WHERE w.ended_at IS NOT NULL AND EXISTS (SELECT 1 FROM set_entries s WHERE s.workout_log_id = w.id AND s.exercise_id = ? AND s.completed = 1) ORDER BY w.started_at DESC LIMIT 1`,
    exerciseId,
  );
  if (!log) return [];
  const rows = await db.getAllAsync<SetRow>('SELECT * FROM set_entries WHERE workout_log_id = ? AND exercise_id = ? AND completed = 1 ORDER BY set_index', log.id, exerciseId);
  return rows.map(mapSet);
}

export async function getExerciseHistory(exerciseId: number, limit = 10): Promise<ExerciseHistoryRow[]> {
  const db = await openDatabase();
  return db.getAllAsync<ExerciseHistoryRow>(
    `SELECT w.id as workoutLogId, w.name as workoutName, w.started_at as startedAt, s.set_index as setIndex, s.weight, s.reps, s.completed as completed
     FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE s.exercise_id = ? AND w.ended_at IS NOT NULL AND s.completed = 1
     ORDER BY w.started_at DESC, s.set_index LIMIT ?`,
    exerciseId, limit,
  );
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

/* ------------------------------- history / progress ------------------------------- */
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

/** Consecutive weeks (ending this week) that contain at least one session. */
export async function getStreak(): Promise<number> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ started_at: number }>('SELECT started_at FROM workout_logs WHERE ended_at IS NOT NULL ORDER BY started_at DESC');
  if (rows.length === 0) return 0;
  const weeks = new Set(rows.map((r) => isoDate(startOfWeek(r.started_at))));
  const thisWeek = isoDate(startOfWeek(Date.now()));
  const lastWeek = isoDate(startOfWeek(Date.now()) - 7 * 86_400_000);
  if (!weeks.has(thisWeek) && !weeks.has(lastWeek)) return 0;
  let cursor = weeks.has(thisWeek) ? Date.now() : Date.now() - 7 * 86_400_000;
  let streak = 0;
  while (weeks.has(isoDate(startOfWeek(cursor)))) {
    streak++;
    cursor -= 7 * 86_400_000;
  }
  return streak;
}

export async function getProgressStats(weeks = 8): Promise<ProgressStats> {
  const db = await openDatabase();
  const now = Date.now();
  const weekStart = startOfWeek(now);
  const since = weekStart - (weeks - 1) * 7 * 86_400_000;

  const totals = await db.getFirstAsync<{ c: number; v: number; last: number | null }>(
    'SELECT COUNT(*) as c, COALESCE(SUM(total_volume), 0) as v, MAX(started_at) as last FROM workout_logs WHERE ended_at IS NOT NULL',
  );
  const setCount = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id WHERE w.ended_at IS NOT NULL AND s.completed = 1',
  );

  const logs = await db.getAllAsync<{ started_at: number; total_volume: number }>(
    'SELECT started_at, total_volume FROM workout_logs WHERE ended_at IS NOT NULL AND started_at >= ? ORDER BY started_at',
    since,
  );
  const buckets: WeeklyVolume[] = [];
  for (let i = 0; i < weeks; i++) {
    const ws = weekStart - (weeks - 1 - i) * 7 * 86_400_000;
    buckets.push({ weekStart: isoDate(ws), volume: 0, sessions: 0 });
  }
  for (const l of logs) {
    const ws = isoDate(startOfWeek(l.started_at));
    const b = buckets.find((x) => x.weekStart === ws);
    if (b) { b.volume += l.total_volume; b.sessions += 1; }
  }

  const muscleRows = await db.getAllAsync<{ primary_muscle: string; sets: number; volume: number }>(
    `SELECT e.primary_muscle, COUNT(s.id) as sets, COALESCE(SUM(s.weight * s.reps), 0) as volume
     FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id JOIN exercises e ON e.id = s.exercise_id
     WHERE w.ended_at IS NOT NULL AND s.completed = 1 AND w.started_at >= ?
     GROUP BY e.primary_muscle ORDER BY sets DESC`,
    since,
  );
  const muscleDistribution: MuscleDistribution[] = muscleRows.map((r) => ({ muscle: r.primary_muscle as MuscleGroup, sets: r.sets, volume: r.volume }));

  const prBase = await db.getAllAsync<{ id: number; name: string; max_weight: number; max_reps: number; best_volume: number }>(
    `SELECT e.id, e.name, MAX(s.weight) as max_weight, MAX(s.reps) as max_reps, MAX(s.weight * s.reps) as best_volume
     FROM set_entries s JOIN exercises e ON e.id = s.exercise_id JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE w.ended_at IS NOT NULL AND s.completed = 1
     GROUP BY e.id, e.name`,
  );
  const prs: PR[] = [];
  for (const p of prBase) {
    const atMax = await db.getFirstAsync<{ reps: number; created_at: number }>(
      `SELECT s.reps, s.created_at FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id
       WHERE s.exercise_id = ? AND s.completed = 1 AND w.ended_at IS NOT NULL AND s.weight = ?
       ORDER BY s.created_at DESC LIMIT 1`,
      p.id, p.max_weight,
    );
    prs.push({
      exerciseId: p.id,
      exerciseName: p.name,
      maxWeight: p.max_weight,
      maxReps: p.max_reps,
      estimated1RM: estimated1RM(p.max_weight, atMax?.reps ?? 1),
      bestSetVolume: p.best_volume,
      achievedAt: atMax?.created_at ?? 0,
    });
  }
  prs.sort((a, b) => b.estimated1RM - a.estimated1RM);

  return {
    totalSessions: totals?.c ?? 0,
    totalVolume: totals?.v ?? 0,
    totalSets: setCount?.c ?? 0,
    streak: await getStreak(),
    weeklyVolume: buckets,
    muscleDistribution,
    prs,
    lastSessionAt: totals?.last ?? null,
  };
}

/* ------------------------------- profile ------------------------------- */
export async function getProfile(): Promise<UserProfile> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM user_profile WHERE id = 1');
  if (!row) {
    await db.runAsync(`INSERT INTO user_profile (id, name, goal, bodyweight, unit, onboarding_completed, updated_at) VALUES (1, '', 'build_muscle', NULL, 'metric', 0, ?)`, Date.now());
    return { id: 1, name: '', goal: 'build_muscle', bodyweight: null, unit: 'metric', onboardingCompleted: false, updatedAt: Date.now() };
  }
  return mapProfile(row);
}

export async function saveProfile(patch: Partial<Pick<UserProfile, 'name' | 'goal' | 'bodyweight' | 'unit'>>): Promise<void> {
  const db = await openDatabase();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); args.push(patch.name); }
  if (patch.goal !== undefined) { sets.push('goal = ?'); args.push(patch.goal); }
  if (patch.bodyweight !== undefined) { sets.push('bodyweight = ?'); args.push(patch.bodyweight); }
  if (patch.unit !== undefined) { sets.push('unit = ?'); args.push(patch.unit); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(Date.now());
  args.push(1);
  await db.runAsync(`UPDATE user_profile SET ${sets.join(', ')} WHERE id = ?`, ...args);
}

export async function completeOnboarding(patch: { name: string; goal: Goal; unit: Unit }): Promise<void> {
  await saveProfile({ name: patch.name, goal: patch.goal, unit: patch.unit });
  const db = await openDatabase();
  await db.runAsync('UPDATE user_profile SET onboarding_completed = 1, updated_at = ? WHERE id = 1', Date.now());
}

/* ------------------------------- maintenance ------------------------------- */
export async function clearWorkoutHistory(): Promise<void> {
  const db = await openDatabase();
  await db.execAsync('DELETE FROM workout_logs');
}
