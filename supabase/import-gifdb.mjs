/**
 * Full import: Replace Supabase exercise library with ExerciseGymGifsDB.
 * 1323 exercises with GIFs, instructions, muscles, equipment.
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node supabase/import-gifdb.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GIF_DB_URL = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/api/en/exercises.json';

/* ---- Mapping tables ---- */

const MUSCLE_MAP = {
  abs: 'core',
  biceps: 'biceps',
  triceps: 'triceps',
  delts: 'shoulders',
  forearms: 'forearms',
  chest: 'pectorals',
  lats: 'back',
  traps: 'traps',
  quads: 'quadriceps',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  abductors: 'other',
  adductors: 'other',
  // keep as-is
  neck: 'other',
  shoulders: 'shoulders',
  back: 'back',
  upper_back: 'back',
  lower_back: 'back',
  waist: 'core',
  cardio: 'other',
};

const EQUIP_MAP = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  lever: 'machine',
  smith: 'machine',
  bodyweight: 'bodyweight',
  band: 'band',
  resistance: 'band',
  kettlebell: 'kettlebell',
  ez: 'barbell',
  'ez-bar': 'barbell',
  other: 'other',
};

const CATEGORY_MAP = {
  strength: 'strength',
  stretching: 'mobility',
  cardio: 'cardio',
  plyometrics: 'accessory',
};

function mapMuscle(m) {
  return MUSCLE_MAP[m] ?? m;
}

function mapEquip(e) {
  return EQUIP_MAP[e] ?? e;
}

function mapCategory(c) {
  return CATEGORY_MAP[c] ?? c;
}

/** Heuristic: compound if multiple muscle groups targeted or known compound movements. */
function isCompound(ex) {
  const compoundKeywords = ['press', 'squat', 'deadlift', 'row', 'pull-up', 'chin-up', 'dip', 'lunge', 'clean', 'snatch', 'thruster', 'burpee'];
  const name = ex.name.toLowerCase();
  if (compoundKeywords.some((k) => name.includes(k))) return true;
  if ((ex.secondaryMuscles?.length ?? 0) >= 2) return true;
  return false;
}

async function main() {
  console.log('Fetching ExerciseGymGifsDB...');
  const res = await fetch(GIF_DB_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const gifData = await res.json();
  const exercises = gifData.exercises || [];
  console.log(`Loaded ${exercises.length} exercises`);

  // Delete all existing exercises (clean slate)
  console.log('Clearing existing exercises...');
  const { error: delErr } = await supabase.from('exercises').delete().neq('id', 0);
  if (delErr) throw delErr;

  // Insert in batches
  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < exercises.length; i += BATCH) {
    const batch = exercises.slice(i, i + BATCH);
    const rows = batch.map((ex) => {
      const primary = mapMuscle(ex.muscle);
      const equip = mapEquip(ex.equipment);
      const cat = mapCategory(ex.category);
      const secondary = (ex.secondaryMuscles ?? []).map(mapMuscle).filter(Boolean);

      return {
        external_id: ex.id,
        name: ex.name,
        body_part: ex.bodyPart ?? '',
        equipment: equip,
        target_muscle: primary,
        secondary_muscles: secondary,
        movement_pattern: 'isolation',
        category: cat,
        is_compound: isCompound(ex),
        difficulty: 'intermediate',
        instructions: ex.instructions ?? [],
        gif_url: ex.gifUrl ?? '',
      };
    });

    const { error } = await supabase.from('exercises').insert(rows);
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH)} failed:`, error.message);
    } else {
      inserted += rows.length;
      process.stdout.write(`\r  Inserted ${inserted}/${exercises.length}`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} exercises into Supabase.`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
