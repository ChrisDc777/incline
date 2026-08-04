import { openDatabase } from './client';
import { estimated1RM, isoDate, startOfWeek } from './calc';
import { PAGINATION } from '@/constants/config';
import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Category,
  Difficulty,
  Equipment,
  Exercise,
  ExerciseHistoryRow,
  ExperienceLevel,
  FeedWorkoutLog,
  Goal,
  MovementPattern,
  MonthlyVolume,
  MuscleDistribution,
  MuscleGroup,
  Paginated,
  PeriodStats,
  PR,
  ProgressRange,
  ProgressStats,
  Program,
  ProgramWorkout,
  SearchHit,
  SetEntry,
  TemplateExercise,
  Trend,
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
  movement_pattern: string | null;
  equipment: string;
  category: string;
  is_compound: number;
  is_custom: number;
  source: string;
  external_id: string | null;
  difficulty: string | null;
  default_rest_seconds: number;
  tips: string | null;
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
interface ProfileRow { id: number; name: string; goal: string; bodyweight: number | null; unit: string; experience_level: string; onboarding_completed: number; avatar_url: string | null; updated_at: number }

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
  const imgRow = await db.getFirstAsync<{ url: string }>('SELECT url FROM exercise_images WHERE exercise_id = ? AND is_primary = 1 LIMIT 1', row.id);
  return {
    id: row.id,
    name: row.name,
    aliases,
    primaryMuscle: row.primary_muscle as MuscleGroup,
    secondaryMuscles,
    movementPattern: row.movement_pattern as MovementPattern | null,
    equipment: row.equipment as Equipment,
    category: row.category as Category,
    isCompound: !!row.is_compound,
    isCustom: !!row.is_custom,
    source: row.source as 'seed' | 'exercisedb' | 'custom',
    externalId: row.external_id,
    difficulty: row.difficulty,
    defaultRestSeconds: row.default_rest_seconds,
    instructions,
    tips: row.tips,
    imageUrl: imgRow?.url ?? null,
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
    experienceLevel: (r.experience_level as ExperienceLevel) ?? 'intermediate',
    onboardingCompleted: !!r.onboarding_completed,
    avatarUrl: r.avatar_url ?? null,
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

export async function getExerciseByExternalId(externalId: string): Promise<Exercise | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE external_id = ?', externalId);
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

  // Batch-load related data to avoid N+1 queries
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');

  const [aliasRows, muscleRows, instrRows, imgRows] = await Promise.all([
    db.getAllAsync<{ exercise_id: number; alias: string }>(
      `SELECT exercise_id, alias FROM exercise_aliases WHERE exercise_id IN (${placeholders}) ORDER BY id`, ...ids,
    ),
    db.getAllAsync<{ exercise_id: number; muscle: string }>(
      `SELECT exercise_id, muscle FROM exercise_secondary_muscles WHERE exercise_id IN (${placeholders}) ORDER BY id`, ...ids,
    ),
    db.getAllAsync<{ exercise_id: number; text: string }>(
      `SELECT exercise_id, text FROM exercise_instructions WHERE exercise_id IN (${placeholders}) ORDER BY step`, ...ids,
    ),
    db.getAllAsync<{ exercise_id: number; url: string }>(
      `SELECT exercise_id, url FROM exercise_images WHERE exercise_id IN (${placeholders}) AND is_primary = 1`, ...ids,
    ),
  ]);

  // Build lookup maps
  const aliasMap = new Map<number, string[]>();
  for (const r of aliasRows) {
    if (!aliasMap.has(r.exercise_id)) aliasMap.set(r.exercise_id, []);
    aliasMap.get(r.exercise_id)!.push(r.alias);
  }
  const muscleMap = new Map<number, MuscleGroup[]>();
  for (const r of muscleRows) {
    if (!muscleMap.has(r.exercise_id)) muscleMap.set(r.exercise_id, []);
    muscleMap.get(r.exercise_id)!.push(r.muscle as MuscleGroup);
  }
  const instrMap = new Map<number, string[]>();
  for (const r of instrRows) {
    if (!instrMap.has(r.exercise_id)) instrMap.set(r.exercise_id, []);
    instrMap.get(r.exercise_id)!.push(r.text);
  }
  const imgMap = new Map<number, string>();
  for (const r of imgRows) imgMap.set(r.exercise_id, r.url);

  // Assemble exercises
  const exercises: Exercise[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    aliases: aliasMap.get(row.id) ?? [],
    primaryMuscle: row.primary_muscle as MuscleGroup,
    secondaryMuscles: muscleMap.get(row.id) ?? [],
    movementPattern: row.movement_pattern as MovementPattern | null,
    equipment: row.equipment as Equipment,
    category: row.category as Category,
    isCompound: !!row.is_compound,
    isCustom: !!row.is_custom,
    source: row.source as 'seed' | 'exercisedb' | 'custom',
    externalId: row.external_id,
    difficulty: row.difficulty,
    defaultRestSeconds: row.default_rest_seconds,
    instructions: instrMap.get(row.id) ?? [],
    tips: row.tips,
    imageUrl: imgMap.get(row.id) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

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
    else if (ex.movementPattern && (ex.movementPattern.includes(q) || ex.movementPattern.replace('_', ' ').includes(q))) { score = 30; matchedOn = 'pattern'; }
    else if (isSubsequence(q, name)) { score = 20; matchedOn = 'name'; }
    else if (aliases.some((a) => isSubsequence(q, a))) { score = 18; matchedOn = 'alias'; }
    if (matchedOn) hits.push({ exercise: ex, score, matchedOn });
  }
  hits.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
  return hits;
}

/* ------------------------------- custom exercises ------------------------------- */
export interface CreateCustomExerciseInput {
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  movementPattern: MovementPattern;
  equipment: Equipment;
  category: Category;
  isCompound?: boolean;
  instructions?: string[];
  tips?: string;
  aliases?: string[];
}

export async function createCustomExercise(input: CreateCustomExerciseInput): Promise<number> {
  const db = await openDatabase();
  const now = Date.now();
  const res = await db.runAsync(
    `INSERT INTO exercises (name, primary_muscle, movement_pattern, equipment, category, is_compound, is_custom, tips, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    input.name, input.primaryMuscle, input.movementPattern, input.equipment, input.category, input.isCompound ? 1 : 0, input.tips ?? '', now, now,
  );
  const id = res.lastInsertRowId as number;
  for (const alias of (input.aliases ?? [])) {
    await db.runAsync(`INSERT INTO exercise_aliases (exercise_id, alias) VALUES (?, ?)`, id, alias.toLowerCase());
  }
  for (const muscle of (input.secondaryMuscles ?? [])) {
    await db.runAsync(`INSERT INTO exercise_secondary_muscles (exercise_id, muscle) VALUES (?, ?)`, id, muscle);
  }
  for (let i = 0; i < (input.instructions ?? []).length; i++) {
    await db.runAsync(`INSERT INTO exercise_instructions (exercise_id, step, text) VALUES (?, ?, ?)`, id, i + 1, input.instructions![i]);
  }
  return id;
}

export async function deleteCustomExercise(id: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM exercises WHERE id = ? AND is_custom = 1', id);
}

/** List only user-created exercises (local SQLite), sorted by name. */
export async function listCustomExercises(): Promise<Exercise[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<ExerciseRow>('SELECT * FROM exercises WHERE is_custom = 1 ORDER BY name');
  return Promise.all(rows.map((row) => mapExercise(db, row)));
}

/** Logged sets + template usages for an exercise (0 = safe to delete). */
export async function getCustomExerciseUsage(exerciseId: number): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT (SELECT COUNT(*) FROM set_entries WHERE exercise_id = ?) + (SELECT COUNT(*) FROM template_exercises WHERE exercise_id = ?) AS c`,
    exerciseId, exerciseId,
  );
  return row?.c ?? 0;
}

export async function updateExerciseDefaultRest(exerciseId: number, seconds: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('UPDATE exercises SET default_rest_seconds = ?, updated_at = ? WHERE id = ?', seconds, Date.now(), exerciseId);
}

export async function getExerciseDefaultRest(exerciseId: number): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ default_rest_seconds: number }>(
    'SELECT default_rest_seconds FROM exercises WHERE id = ?',
    exerciseId,
  );
  return row?.default_rest_seconds ?? 0;
}

/**
 * Ensure an exercise exists in local SQLite by external_id.
 * If it exists, return its local id. If not, insert it and return the new id.
 * Used when picking exercises from Supabase — saves locally for workout logging.
 */
export async function ensureExerciseExists(
  exercise: {
    name: string;
    primaryMuscle: MuscleGroup;
    secondaryMuscles?: MuscleGroup[];
    movementPattern?: MovementPattern | null;
    equipment: Equipment;
    category: Category;
    isCompound: boolean;
    instructions?: string[];
    tips?: string | null;
    defaultRestSeconds?: number;
  },
  externalId: string,
): Promise<number> {
  const db = await openDatabase();
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM exercises WHERE external_id = ?',
    externalId,
  );
  if (existing) return existing.id;

  const now = Date.now();
  const res = await db.runAsync(
     `INSERT INTO exercises (name, primary_muscle, movement_pattern, equipment, category, is_compound, is_custom, source, external_id, difficulty, default_rest_seconds, tips, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'exercisedb', ?, 'intermediate', ?, '', ?, ?)`,
    exercise.name, exercise.primaryMuscle, exercise.movementPattern ?? 'isolation', exercise.equipment,
    exercise.category, exercise.isCompound ? 1 : 0, externalId,
    exercise.defaultRestSeconds ?? 90, now, now,
  );
  const id = res.lastInsertRowId as number;

  // Secondary muscles
  for (const muscle of exercise.secondaryMuscles ?? []) {
    await db.runAsync(
      'INSERT INTO exercise_secondary_muscles (exercise_id, muscle) VALUES (?, ?)',
      id, muscle,
    );
  }

  // Instructions
  for (let i = 0; i < (exercise.instructions ?? []).length; i++) {
    await db.runAsync(
      'INSERT INTO exercise_instructions (exercise_id, step, text) VALUES (?, ?, ?)',
      id, i + 1, exercise.instructions![i],
    );
  }

  return id;
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
  /** First few exercise names (for previews). */
  exerciseNames: string[];
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
    const exerciseRows = await db.getAllAsync<{ name: string }>(
      'SELECT e.name FROM template_exercises te JOIN exercises e ON e.id = te.exercise_id WHERE te.template_id = ? ORDER BY te.sort_order LIMIT 4',
      t.id,
    );
    out.push({
      template: mapTemplate(t, []),
      exerciseCount: countRow?.c ?? 0,
      muscleFocus: muscleRows.map((r) => r.primary_muscle as MuscleGroup),
      exerciseNames: exerciseRows.map((r) => r.name),
    });
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
  for (let i = 0; i < exerciseIds.length; i++) {
    await db.runAsync('UPDATE template_exercises SET sort_order = ? WHERE id = ? AND template_id = ?', i, exerciseIds[i], templateId);
  }
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
  const pwRows = await db.getAllAsync<(ProgramWorkoutRow & { template_name: string | null; estimated_minutes: number | null })>(
    `SELECT pw.*, t.name AS template_name, t.estimated_minutes
     FROM program_workouts pw
     LEFT JOIN workout_templates t ON t.id = pw.template_id
     WHERE pw.program_id = ? ORDER BY pw.week, pw.day, pw.sort_order`,
    id,
  );
  const workouts: ProgramWorkout[] = pwRows.map((r) => ({
    id: r.id, programId: r.program_id, templateId: r.template_id,
    week: r.week, day: r.day, sortOrder: r.sort_order,
    templateName: r.template_name ?? 'Workout',
    estimatedMinutes: r.estimated_minutes ?? 0,
  }));
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

export interface ExercisePRSummary {
  heaviestWeight: number;
  best1RM: number;
  bestSetVolume: number;
  bestSessionVolume: number;
  heaviestWeightAt: number;
}

export async function getExercisePRSummary(exerciseId: number): Promise<ExercisePRSummary> {
  const db = await openDatabase();
  const base = await db.getFirstAsync<{ max_weight: number; max_reps: number; best_set_vol: number }>(
    `SELECT MAX(s.weight) as max_weight, MAX(s.reps) as max_reps, MAX(s.weight * s.reps) as best_set_vol
     FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE s.exercise_id = ? AND w.ended_at IS NOT NULL AND s.completed = 1`,
    exerciseId,
  );
  const maxWeight = base?.max_weight ?? 0;
  const maxReps = base?.max_reps ?? 1;
  const best1RM = estimated1RM(maxWeight, maxReps);
  const bestSetVol = base?.best_set_vol ?? 0;

  // Best session volume: max sum(weight*reps) per workout_log
  const sessionVol = await db.getFirstAsync<{ vol: number }>(
    `SELECT SUM(s.weight * s.reps) as vol
     FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE s.exercise_id = ? AND w.ended_at IS NOT NULL AND s.completed = 1
     GROUP BY w.id ORDER BY vol DESC LIMIT 1`,
    exerciseId,
  );

  // When was heaviest weight achieved
  const atMax = await db.getFirstAsync<{ created_at: number }>(
    `SELECT s.created_at FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE s.exercise_id = ? AND s.completed = 1 AND w.ended_at IS NOT NULL AND s.weight = ?
     ORDER BY s.created_at DESC LIMIT 1`,
    exerciseId, maxWeight,
  );

  return {
    heaviestWeight: maxWeight,
    best1RM,
    bestSetVolume: bestSetVol,
    bestSessionVolume: sessionVol?.vol ?? 0,
    heaviestWeightAt: atMax?.created_at ?? 0,
  };
}

export interface RepRecord {
  reps: number;
  weight: number;
}

export async function getExerciseRepRecords(exerciseId: number): Promise<RepRecord[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ reps: number; weight: number }>(
    `SELECT s.reps, MAX(s.weight) as weight
     FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE s.exercise_id = ? AND w.ended_at IS NOT NULL AND s.completed = 1 AND s.reps > 0
     GROUP BY s.reps ORDER BY s.reps`,
    exerciseId,
  );
  return rows;
}

export interface ProgressionPoint {
  date: string;
  weight: number;
}

export async function getExerciseProgression(exerciseId: number): Promise<ProgressionPoint[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ w: string; weight: number }>(
    `SELECT strftime('%Y-%m-%d', s.created_at / 1000, 'unixepoch') as w, MAX(s.weight) as weight
     FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE s.exercise_id = ? AND w.ended_at IS NOT NULL AND s.completed = 1
     GROUP BY w ORDER BY w`,
    exerciseId,
  );
  return rows.map((r) => ({ date: r.w, weight: r.weight }));
}

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

const RANGE_WEEKS: Record<ProgressRange, number> = { '1m': 5, '3m': 13, '6m': 26, all: 52 };

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Time-windowed progress stats (1 month / 3 months / 6 months / all time) used
 * by the Progress insights. Returns weekly and monthly volume series plus
 * muscle distribution, PRs and a "vs previous period" trend.
 */
export async function getPeriodStats(range: ProgressRange): Promise<PeriodStats> {
  const db = await openDatabase();
  const now = Date.now();
  const weeks = RANGE_WEEKS[range];
  const since = range === 'all' ? 0 : now - weeks * 7 * 86_400_000;
  const weekStart = startOfWeek(now);

  // Bucket setup
  const weekly: WeeklyVolume[] = [];
  const weeklyMap = new Map<string, WeeklyVolume>();
  for (let i = 0; i < weeks; i++) {
    const ws = weekStart - (weeks - 1 - i) * 7 * 86_400_000;
    const key = isoDate(ws);
    const bucket = { weekStart: key, volume: 0, sessions: 0 };
    weekly.push(bucket);
    weeklyMap.set(key, bucket);
  }

  const logs = await db.getAllAsync<{ started_at: number; total_volume: number }>(
    'SELECT started_at, total_volume FROM workout_logs WHERE ended_at IS NOT NULL AND started_at >= ? ORDER BY started_at',
    since,
  );

  const monthlyMap = new Map<string, MonthlyVolume>();
  let totalVolume = 0;
  let sessions = 0;
  for (const l of logs) {
    totalVolume += l.total_volume;
    sessions += 1;
    const wk = isoDate(startOfWeek(l.started_at));
    const wb = weeklyMap.get(wk);
    if (wb) { wb.volume += l.total_volume; wb.sessions += 1; }
    const mk = monthKey(l.started_at);
    const mb = monthlyMap.get(mk);
    if (mb) { mb.volume += l.total_volume; mb.sessions += 1; }
    else { monthlyMap.set(mk, { month: mk, volume: l.total_volume, sessions: 1 }); }
  }
  const monthly = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  const setCount = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id WHERE w.ended_at IS NOT NULL AND s.completed = 1 AND w.started_at >= ?',
    since,
  );

  const muscleRows = await db.getAllAsync<{ primary_muscle: string; sets: number; volume: number }>(
    `SELECT e.primary_muscle, COUNT(s.id) as sets, COALESCE(SUM(s.weight * s.reps), 0) as volume
     FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id JOIN exercises e ON e.id = s.exercise_id
     WHERE w.ended_at IS NOT NULL AND s.completed = 1 AND w.started_at >= ?
     GROUP BY e.primary_muscle ORDER BY sets DESC`,
    since,
  );
  const muscleDistribution: MuscleDistribution[] = muscleRows.map((r) => ({ muscle: r.primary_muscle as MuscleGroup, sets: r.sets, volume: r.volume }));

  // PRs achieved within the window (best estimate-1RM per exercise)
  const prRows = await db.getAllAsync<{ exerciseId: number; name: string; weight: number; reps: number; created_at: number }>(
    `SELECT e.id as exerciseId, e.name, s.weight, s.reps, s.created_at
     FROM set_entries s JOIN exercises e ON e.id = s.exercise_id JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE w.ended_at IS NOT NULL AND s.completed = 1 AND s.weight > 0 AND s.created_at >= ?`,
    since,
  );
  const bestMap = new Map<number, { exerciseId: number; name: string; oneRM: number; at: number }>();
  for (const r of prRows) {
    const oneRM = estimated1RM(r.weight, r.reps);
    const cur = bestMap.get(r.exerciseId);
    if (!cur || oneRM > cur.oneRM) {
      bestMap.set(r.exerciseId, { exerciseId: r.exerciseId, name: r.name, oneRM, at: r.created_at });
    }
  }
  const prs: PR[] = [...bestMap.values()]
    .map((b) => ({ exerciseId: b.exerciseId, exerciseName: b.name, maxWeight: 0, maxReps: 0, estimated1RM: b.oneRM, bestSetVolume: 0, achievedAt: b.at }))
    .sort((a, b) => b.estimated1RM - a.estimated1RM);

  // Trend: compare the most recent bucket period to the equal-length window before it
  const bucketLen = range === '1m' || range === '3m' ? 7 * 86_400_000 : 30 * 86_400_000;
  const trend = computeTrend(logs, now, bucketLen);

  return {
    range,
    sessions,
    totalVolume,
    totalSets: setCount?.c ?? 0,
    streak: await getStreak(),
    weeklyVolume: weekly,
    monthlyVolume: monthly,
    muscleDistribution,
    prs,
    trend,
  };
}

function computeTrend(logs: { started_at: number; total_volume: number }[], now: number, bucketLen: number): Trend | null {
  const currentStart = now - bucketLen;
  const prevStart = now - 2 * bucketLen;
  let curVol = 0, prevVol = 0, curSes = 0, prevSes = 0;
  for (const l of logs) {
    if (l.started_at >= currentStart) { curVol += l.total_volume; curSes += 1; }
    else if (l.started_at >= prevStart) { prevVol += l.total_volume; prevSes += 1; }
  }
  if (prevVol <= 0 && prevSes <= 0) return null;
  return {
    volumeDelta: prevVol > 0 ? Math.round(((curVol - prevVol) / prevVol) * 100) : (curVol > 0 ? 100 : 0),
    sessionsDelta: prevSes > 0 ? Math.round(((curSes - prevSes) / prevSes) * 100) : (curSes > 0 ? 100 : 0),
  };
}

/* ------------------------------- profile ------------------------------- */
export async function getProfile(): Promise<UserProfile> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM user_profile WHERE id = 1');
  if (!row) {
    await db.runAsync(`INSERT INTO user_profile (id, name, goal, bodyweight, unit, experience_level, onboarding_completed, updated_at) VALUES (1, '', 'build_muscle', NULL, 'metric', 'intermediate', 0, ?)`, Date.now());
    return { id: 1, name: '', goal: 'build_muscle', bodyweight: null, unit: 'metric', experienceLevel: 'intermediate', onboardingCompleted: false, avatarUrl: null, updatedAt: Date.now() };
  }
  return mapProfile(row);
}

export async function saveProfile(patch: Partial<Pick<UserProfile, 'name' | 'goal' | 'bodyweight' | 'unit' | 'experienceLevel' | 'avatarUrl'>>): Promise<void> {
  const db = await openDatabase();
  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM user_profile WHERE id = 1');
  if (!existing) {
    // First time — insert a row
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO user_profile (id, name, goal, bodyweight, unit, experience_level, onboarding_completed, updated_at)
       VALUES (1, '', 'build_muscle', NULL, 'metric', 'intermediate', 0, ?)`,
      now,
    );
  }
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); args.push(patch.name); }
  if (patch.goal !== undefined) { sets.push('goal = ?'); args.push(patch.goal); }
  if (patch.bodyweight !== undefined) { sets.push('bodyweight = ?'); args.push(patch.bodyweight); }
  if (patch.unit !== undefined) { sets.push('unit = ?'); args.push(patch.unit); }
  if (patch.experienceLevel !== undefined) { sets.push('experience_level = ?'); args.push(patch.experienceLevel); }
  if (patch.avatarUrl !== undefined) { sets.push('avatar_url = ?'); args.push(patch.avatarUrl); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(Date.now());
  args.push(1);
  await db.runAsync(`UPDATE user_profile SET ${sets.join(', ')} WHERE id = ?`, ...args);
}

export async function completeOnboarding(patch: { name: string; goal: Goal; unit: Unit; experienceLevel?: ExperienceLevel; bodyweight?: number }): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM user_profile WHERE id = 1');
  if (!existing) {
    await db.runAsync(
      `INSERT INTO user_profile (id, name, goal, bodyweight, unit, experience_level, onboarding_completed, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, 1, ?)`,
      patch.name, patch.goal, patch.bodyweight ?? null, patch.unit, patch.experienceLevel ?? 'intermediate', now,
    );
  } else {
    await db.runAsync(
      `UPDATE user_profile SET name = ?, goal = ?, bodyweight = ?, unit = ?, experience_level = ?, onboarding_completed = 1, updated_at = ? WHERE id = 1`,
      patch.name, patch.goal, patch.bodyweight ?? null, patch.unit, patch.experienceLevel ?? 'intermediate', now,
    );
  }
}

/* ------------------------------- maintenance ------------------------------- */
export async function deleteWorkout(logId: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM workout_logs WHERE id = ?', logId);
}

export async function clearWorkoutHistory(): Promise<void> {
  const db = await openDatabase();
  await db.execAsync('DELETE FROM workout_logs');
}

/* ------------------------------- bodyweight tracking ------------------------------- */
export async function addBodyweightEntry(weight: number, unit: string): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  await db.runAsync('INSERT INTO bodyweight_entries (weight, unit, recorded_at, created_at) VALUES (?, ?, ?, ?)', weight, unit, now, now);
}

export async function getBodyweightEntries(limit = 90): Promise<{ id: number; weight: number; unit: string; recordedAt: number }[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ id: number; weight: number; unit: string; recorded_at: number }>(
    'SELECT id, weight, unit, recorded_at FROM bodyweight_entries ORDER BY recorded_at DESC LIMIT ?', limit,
  );
  return rows.map((r) => ({ id: r.id, weight: r.weight, unit: r.unit, recordedAt: r.recorded_at }));
}

export async function getLatestBodyweight(): Promise<number | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ weight: number }>('SELECT weight FROM bodyweight_entries ORDER BY recorded_at DESC LIMIT 1');
  return row?.weight ?? null;
}

export async function deleteBodyweightEntry(id: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM bodyweight_entries WHERE id = ?', id);
}

/** Returns timestamps of local-midnight for each distinct day with completed workouts. */
export async function getWorkoutDays(): Promise<number[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ started_at: number }>(
    'SELECT started_at FROM workout_logs WHERE ended_at IS NOT NULL ORDER BY started_at',
  );
  const seen = new Set<string>();
  const days: number[] = [];
  for (const r of rows) {
    const d = new Date(r.started_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  }
  return days;
}

/** Returns completed workout logs within a date range (start/end in ms). */
export async function getWorkoutsByDateRange(startMs: number, endMs: number): Promise<WorkoutLog[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<LogRow>(
    `SELECT * FROM workout_logs WHERE ended_at IS NOT NULL AND started_at >= ? AND started_at < ? ORDER BY started_at`,
    startMs, endMs,
  );
  return rows.map(mapLog);
}

/** Returns completed workout logs for a specific day (given epoch ms for the day start). */
export async function getWorkoutsForDay(dayMs: number): Promise<WorkoutLog[]> {
  const db = await openDatabase();
  const nextDay = dayMs + 86400000;
  const rows = await db.getAllAsync<LogRow>(
    `SELECT * FROM workout_logs WHERE ended_at IS NOT NULL AND started_at >= ? AND started_at < ? ORDER BY started_at`,
    dayMs, nextDay,
  );
  return rows.map(mapLog);
}

/** Returns the number of completed workout days in a date range. */
export async function getWorkoutCountInRange(startMs: number, endMs: number): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(DISTINCT (started_at / 86400000) * 86400000) as c FROM workout_logs WHERE ended_at IS NOT NULL AND started_at >= ? AND started_at < ?`,
    startMs, endMs,
  );
  return row?.c ?? 0;
}

/* ----------------------------- dev helpers ----------------------------- */

/** Clear user logs, bodyweight, and profile — keeps exercise library and templates. */
export async function resetUserData(): Promise<void> {
  const db = await openDatabase();
  await db.execAsync('DELETE FROM set_entries');
  await db.execAsync('DELETE FROM workout_logs');
  await db.execAsync('DELETE FROM bodyweight_entries');
  await db.execAsync('DELETE FROM user_profile');
}

/**
 * Seed sample data for testing: 2 templates + 2 completed workout logs.
 * Returns template IDs for reference.
 */
export async function seedSampleData(): Promise<{ templateIds: number[] }> {
  const db = await openDatabase();
  const now = Date.now();
  const DAY = 86_400_000;

  // --- Find exercise IDs by name ---
  const findId = async (name: string) => {
    const row = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM exercises WHERE name LIKE ? LIMIT 1',
      `%${name}%`,
    );
    return row?.id ?? null;
  };

  // --- Template 1: Upper Body Push ---
  const t1 = await db.runAsync(
    `INSERT INTO workout_templates (name, description, category, difficulty, estimated_minutes, created_at, updated_at)
     VALUES (?, ?, 'strength', 'intermediate', 45, ?, ?)`,
    'Upper Body Push', 'Bench, OHP, triceps', now, now,
  );
  const t1Id = t1.lastInsertRowId as number;

  const benchId = await findId('Bench Press');
  const ohpId = await findId('Overhead Press');
  const triId = await findId('Tricep Pushdown');
  const latId = await findId('Lateral Raise');

  const pushExercises = [
    { id: benchId, order: 0, sets: 4, repsMin: 6, repsMax: 10, rest: 120 },
    { id: ohpId, order: 1, sets: 3, repsMin: 8, repsMax: 12, rest: 90 },
    { id: latId, order: 2, sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
    { id: triId, order: 3, sets: 3, repsMin: 10, repsMax: 15, rest: 60 },
  ].filter((e) => e.id);

  for (const ex of pushExercises) {
    await db.runAsync(
      `INSERT INTO template_exercises (template_id, exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, '')`,
      t1Id, ex.id, ex.order, ex.sets, ex.repsMin, ex.repsMax, ex.rest,
    );
  }

  // --- Template 2: Lower Body ---
  const t2 = await db.runAsync(
    `INSERT INTO workout_templates (name, description, category, difficulty, estimated_minutes, created_at, updated_at)
     VALUES (?, ?, 'strength', 'intermediate', 50, ?, ?)`,
    'Lower Body', 'Squat, RDL, leg press', now, now,
  );
  const t2Id = t2.lastInsertRowId as number;

  const squatId = await findId('Squat');
  const rdlId = await findId('Romanian Deadlift');
  const legExtId = await findId('Leg Extension');
  const legCurlId = await findId('Leg Curl');
  const calfId = await findId('Calf Raise');

  const lowerExercises = [
    { id: squatId, order: 0, sets: 4, repsMin: 6, repsMax: 10, rest: 150 },
    { id: rdlId, order: 1, sets: 3, repsMin: 8, repsMax: 12, rest: 120 },
    { id: legExtId, order: 2, sets: 3, repsMin: 12, repsMax: 15, rest: 60 },
    { id: legCurlId, order: 3, sets: 3, repsMin: 10, repsMax: 15, rest: 60 },
    { id: calfId, order: 4, sets: 4, repsMin: 12, repsMax: 20, rest: 45 },
  ].filter((e) => e.id);

  for (const ex of lowerExercises) {
    await db.runAsync(
      `INSERT INTO template_exercises (template_id, exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, '')`,
      t2Id, ex.id, ex.order, ex.sets, ex.repsMin, ex.repsMax, ex.rest,
    );
  }

  // --- Sample completed workout logs (last 3 days) ---
  const sampleSessions = [
    { templateId: t1Id, name: 'Upper Body Push', daysAgo: 2, exercises: [
      { name: 'Bench Press', sets: [{ w: 80, r: 8 }, { w: 80, r: 7 }, { w: 75, r: 9 }, { w: 75, r: 8 }] },
      { name: 'Overhead Press', sets: [{ w: 40, r: 10 }, { w: 40, r: 9 }, { w: 40, r: 8 }] },
    ]},
    { templateId: t2Id, name: 'Lower Body', daysAgo: 1, exercises: [
      { name: 'Squat', sets: [{ w: 100, r: 6 }, { w: 100, r: 5 }, { w: 90, r: 8 }, { w: 90, r: 7 }] },
      { name: 'Romanian Deadlift', sets: [{ w: 80, r: 10 }, { w: 80, r: 9 }, { w: 80, r: 8 }] },
    ]},
  ];

  for (const sess of sampleSessions) {
    const started = now - sess.daysAgo * DAY + 10 * 3600_000; // 10am
    const ended = started + 50 * 60_000; // 50 min workout
    const log = await db.runAsync(
      `INSERT INTO workout_logs (template_id, name, started_at, ended_at, duration_seconds, total_volume, unit, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 3000, 0, 'metric', '', ?, ?)`,
      sess.templateId, sess.name, started, ended, started, now,
    );
    const logId = log.lastInsertRowId as number;

    let totalVolume = 0;
    for (const ex of sess.exercises) {
      const exId = await findId(ex.name);
      if (!exId) continue;
      for (let i = 0; i < ex.sets.length; i++) {
        const s = ex.sets[i];
        totalVolume += s.w * s.r;
        await db.runAsync(
          `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, created_at)
           VALUES (?, ?, ?, ?, ?, 1, 90, ?)`,
          logId, exId, i, s.w, s.r, started + i * 120_000,
        );
      }
    }
    await db.runAsync('UPDATE workout_logs SET total_volume = ? WHERE id = ?', totalVolume, logId);
  }

  // Create a user profile
  await db.runAsync(
    `INSERT OR REPLACE INTO user_profile (id, name, goal, bodyweight, unit, experience_level, onboarding_completed, updated_at)
     VALUES (1, 'Chris', 'build_muscle', 85, 'metric', 'intermediate', 1, ?)`,
    now,
  );

  return { templateIds: [t1Id, t2Id] };
}
