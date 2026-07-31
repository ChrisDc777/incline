/**
 * One-time import: ExerciseDB free API → Supabase
 *
 * Usage:
 *   1. Set env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY (from Supabase dashboard → Settings → API)
 *   2. Run: node supabase/import-exercises.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role key, NOT anon key
const FREE_API = 'https://oss.exercisedb.dev/api/v1';
const BATCH = 100;
const MAX = 1500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MUSCLE_MAP = {
  abs: 'core', biceps: 'biceps', triceps: 'triceps', chest: 'chest',
  'lower back': 'back', 'upper back': 'back', back: 'back', lats: 'back',
  traps: 'traps', shoulders: 'shoulders', quads: 'quads', hamstrings: 'hamstrings',
  glutes: 'glutes', calves: 'calves', forearms: 'forearms', waist: 'core',
  spine: 'core', neck: 'traps', hip: 'glutes', adductors: 'core', abductors: 'glutes',
};

const EQUIPMENT_MAP = {
  bodyweight: 'bodyweight', 'body weight': 'bodyweight', barbell: 'barbell',
  dumbbell: 'dumbbell', cable: 'cable', machine: 'machine',
  'leverage machine': 'machine', kettlebell: 'kettlebell', band: 'band',
  'resistance band': 'band', assisted: 'machine', other: 'other',
};

function mapMuscle(m) { return MUSCLE_MAP[m.toLowerCase().trim()] ?? 'full_body'; }
function mapEquipment(e) { return EQUIPMENT_MAP[e.toLowerCase().trim()] ?? 'other'; }

function inferPattern(ex) {
  const n = ex.name.toLowerCase(), m = ex.target.toLowerCase(), eq = ex.equipment.toLowerCase();
  if (eq === 'barbell' || eq === 'dumbbell') {
    if (m.includes('chest') || m.includes('shoulder')) {
      if (n.includes('press') || n.includes('push')) return 'horizontal_push';
      if (n.includes('overhead') || n.includes('shoulder')) return 'vertical_push';
    }
    if (m.includes('back') || m.includes('lats')) {
      if (n.includes('row') || n.includes('pull')) return 'horizontal_pull';
    }
    if (m.includes('quad') || m.includes('glute') || m.includes('hamstring')) {
      if (n.includes('squat') || n.includes('deadlift') || n.includes('lunge')) return 'squat_hinge';
    }
  }
  if (eq === 'bodyweight' || eq === 'body weight') {
    if (n.includes('push-up') || n.includes('dip')) return 'horizontal_push';
    if (n.includes('pull-up') || n.includes('chin-up')) return 'vertical_pull';
    if (n.includes('squat') || n.includes('lunge')) return 'squat_hinge';
    if (n.includes('plank') || n.includes('crunch')) return 'core';
  }
  return 'isolation';
}

function isCompound(ex) {
  return ['squat_hinge','horizontal_push','vertical_push','horizontal_pull','vertical_pull'].includes(inferPattern(ex));
}

async function main() {
  let offset = 0, imported = 0, errors = 0;

  while (offset < MAX) {
    const resp = await fetch(`${FREE_API}/exercises?limit=${BATCH}&offset=${offset}`);
    const json = await resp.json();
    const data = json.data ?? [];

    if (data.length === 0) break;

    const rows = data.map((ex) => ({
      external_id: ex.exerciseId,
      name: ex.name,
      body_part: ex.bodyParts?.[0] ?? 'unknown',
      equipment: ex.equipments?.[0] ?? 'bodyweight',
      target_muscle: mapMuscle(ex.targetMuscles?.[0] ?? 'unknown'),
      secondary_muscles: (ex.secondaryMuscles ?? []).map(mapMuscle),
      movement_pattern: inferPattern(ex),
      category: isCompound(ex) ? 'strength' : 'accessory',
      is_compound: isCompound(ex),
      difficulty: 'beginner',
      instructions: (ex.instructions ?? []).map(s => s.replace(/^Step:\d+\s*/, '')),
      gif_url: ex.gifUrl ?? '',
    }));

    const { error } = await supabase.from('exercises').upsert(rows, { onConflict: 'external_id' });
    if (error) {
      console.error('Batch error:', error.message);
      errors += rows.length;
    } else {
      imported += rows.length;
      console.log(`Imported ${imported} exercises...`);
    }

    offset += BATCH;
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDone! Imported: ${imported}, Errors: ${errors}`);
}

main().catch(console.error);
