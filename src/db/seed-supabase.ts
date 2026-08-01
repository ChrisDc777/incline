import type { SQLiteDatabase } from 'expo-sqlite';
import { supabase, supabaseReady, type SupabaseExercise } from '@/lib/supabase';

/**
 * Fetch all exercises from Supabase and seed them into local SQLite.
 * Uses upsert by external_id so repeated runs are safe.
 * This bundles the full library for offline use.
 */
export async function seedFromSupabase(db: SQLiteDatabase): Promise<number> {
  if (!supabaseReady || !supabase) return 0;

  const MUSCLE_MAP: Record<string, string> = {
    pectorals: 'chest', lats: 'back', back: 'back',
    full_body: 'full_body', traps: 'traps',
  };
  const EQUIP_MAP: Record<string, string> = {
    'body weight': 'bodyweight', assisted: 'bodyweight',
    weighted: 'bodyweight', 'smith machine': 'machine',
    'leverage machine': 'machine', 'sled machine': 'other',
    'resistance band': 'band', roller: 'other',
  };
  const mapMuscle = (m: string) => MUSCLE_MAP[m] ?? m;
  const mapEquip = (e: string) => EQUIP_MAP[e] ?? e;

  // Fetch all exercises (paginated)
  const all: SupabaseExercise[] = [];
  let offset = 0;
  const PAGE = 200;
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name')
      .range(offset, offset + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    offset += data.length;
  }

  if (all.length === 0) return 0;

  let inserted = 0;
  const now = Date.now();

  for (const ex of all) {
    // Skip if already seeded by local seed (same name, no external_id)
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM exercises WHERE external_id = ? OR (name = ? AND external_id IS NULL)',
      ex.external_id, ex.name,
    );
    if (existing) continue;

    const primary = mapMuscle(ex.target_muscle);
    const equip = mapEquip(ex.equipment);
    const difficulty = ex.difficulty || 'intermediate';
    const defaultRest = ex.is_compound ? 120 : 90;

    const res = await db.runAsync(
      `INSERT INTO exercises (name, primary_muscle, movement_pattern, equipment, category, is_compound, tips, source, external_id, difficulty, default_rest_seconds, is_custom, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'exercisedb', ?, ?, ?, 0, ?, ?)`,
      ex.name, primary, ex.movement_pattern, equip, ex.category,
      ex.is_compound ? 1 : 0, '', ex.external_id, difficulty, defaultRest, now, now,
    );
    const localId = res.lastInsertRowId as number;

    // Secondary muscles
    for (const muscle of ex.secondary_muscles ?? []) {
      const m = mapMuscle(muscle);
      if (m) {
        await db.runAsync(
          'INSERT OR IGNORE INTO exercise_secondary_muscles (exercise_id, muscle) VALUES (?, ?)',
          localId, m,
        );
      }
    }

    // Instructions
    for (let i = 0; i < (ex.instructions ?? []).length; i++) {
      await db.runAsync(
        'INSERT INTO exercise_instructions (exercise_id, step, text) VALUES (?, ?, ?)',
        localId, i + 1, ex.instructions[i],
      );
    }

    // Exercise image/GIF
    if (ex.gif_url) {
      await db.runAsync(
        'INSERT INTO exercise_images (exercise_id, url, is_primary, sort_order) VALUES (?, ?, 1, 0)',
        localId, ex.gif_url,
      );
    }

    inserted++;
  }

  return inserted;
}
