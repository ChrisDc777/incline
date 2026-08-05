import { openDatabase } from '../client';
import type { Program, ProgramWorkout } from '../types';
import {
  type ProgramRow,
  type ProgramWorkoutRow,
} from './helpers';

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
