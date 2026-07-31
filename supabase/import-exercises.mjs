/**
 * One-time import: ExerciseDB free API → Supabase
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node supabase/import-exercises.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FREE_API = 'https://oss.exercisedb.dev/api/v1';
const BATCH = 25;
const MAX = 1500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MUSCLE_MAP = {
  abs:'core',biceps:'biceps',triceps:'triceps',chest:'chest',
  'lower back':'back','upper back':'back',back:'back',lats:'back',
  traps:'traps',shoulders:'shoulders',quads:'quads',hamstrings:'hamstrings',
  glutes:'glutes',calves:'calves',forearms:'forearms',waist:'core',
  spine:'core',neck:'traps',hip:'glutes',adductors:'core',abductors:'glutes',
};

const EQUIPMENT_MAP = {
  bodyweight:'bodyweight','body weight':'bodyweight',barbell:'barbell',
  dumbbell:'dumbbell',cable:'cable',machine:'machine',
  'leverage machine':'machine',kettlebell:'kettlebell',band:'band',
  'resistance band':'band',assisted:'machine',other:'other',
};

function mapMuscle(m) { return MUSCLE_MAP[m?.toLowerCase?.().trim()] ?? 'full_body'; }
function mapEquipment(e) { return EQUIPMENT_MAP[e?.toLowerCase?.().trim()] ?? 'other'; }

function inferPattern(ex) {
  const n = (ex.name||'').toLowerCase(), m = (ex.targetMuscles?.[0]||'').toLowerCase(), eq = (ex.equipments?.[0]||'').toLowerCase();
  if (eq==='barbell'||eq==='dumbbell') {
    if (m.includes('chest')||m.includes('shoulder')) {
      if (n.includes('press')||n.includes('push')) return 'horizontal_push';
      if (n.includes('overhead')||n.includes('shoulder')) return 'vertical_push';
    }
    if (m.includes('back')||m.includes('lats')) {
      if (n.includes('row')||n.includes('pull')) return 'horizontal_pull';
    }
    if (m.includes('quad')||m.includes('glute')||m.includes('hamstring')) {
      if (n.includes('squat')||n.includes('deadlift')||n.includes('lunge')) return 'squat_hinge';
    }
  }
  if (eq==='bodyweight'||eq==='body weight') {
    if (n.includes('push-up')||n.includes('dip')) return 'horizontal_push';
    if (n.includes('pull-up')||n.includes('chin-up')) return 'vertical_pull';
    if (n.includes('squat')||n.includes('lunge')) return 'squat_hinge';
    if (n.includes('plank')||n.includes('crunch')) return 'core';
  }
  return 'isolation';
}

function isCompound(ex) {
  return ['squat_hinge','horizontal_push','vertical_push','horizontal_pull','vertical_pull'].includes(inferPattern(ex));
}

async function main() {
  // Check existing count
  const { count: existingCount } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
  console.log(`Existing exercises: ${existingCount ?? 0}`);

  let offset = 0, imported = 0, skipped = 0, errors = 0, retries = 0;

  while (offset < MAX) {
    let resp;
    try {
      resp = await fetch(`${FREE_API}/exercises?limit=${BATCH}&offset=${offset}`);
    } catch (e) {
      console.log(`Network error: ${e.message}, retrying in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      retries++;
      if (retries > 5) break;
      continue;
    }

    if (!resp.ok) {
      retries++;
      if (retries > 5) { console.log('Too many retries, stopping.'); break; }
      console.log(`API ${resp.status}, retry ${retries}/5 in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }
    retries = 0;

    const json = await resp.json();
    const data = json.data ?? [];
    if (data.length === 0) break;

    // Insert one by one to catch individual failures
    for (const ex of data) {
      const row = {
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
      };

      const { error } = await supabase.from('exercises').upsert(row, { onConflict: 'external_id' });
      if (error) {
        errors++;
        if (errors <= 3) console.error(`  Failed "${ex.name}": ${error.message}`);
      } else {
        imported++;
      }
    }

    console.log(`Offset ${offset}: ${imported} ok, ${errors} errors, ${skipped} skipped`);
    offset += BATCH;
    await new Promise(r => setTimeout(r, 300));
  }

  // Final count
  const { count: finalCount } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
  console.log(`\nDone! Imported: ${imported}, Errors: ${errors}`);
  console.log(`Total in Supabase: ${finalCount}`);
}

main().catch(console.error);
