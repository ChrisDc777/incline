import { openDatabase } from '../client';
import type { Difficulty, MuscleGroup, TemplateExercise, WorkoutTemplate } from '../types';
import { getExercise } from './exercises';
import {
  mapTemplate,
  type TemplateExerciseRow,
  type TemplateRow,
} from './helpers';

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
