import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Category,
  Equipment,
  Exercise,
  MovementPattern,
  MuscleGroup,
} from './types';

interface SeedExercise {
  id: number;
  name: string;
  aliases: string[];
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  movementPattern: MovementPattern;
  equipment: Equipment;
  category: Category;
  isCompound: boolean;
  instructions: string[];
  tips: string;
}

const EXERCISES: SeedExercise[] = [
  { id: 1, name: 'Barbell Bench Press', aliases: ['bp', 'bench', 'chest press'], primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], movementPattern: 'horizontal_push', equipment: 'barbell', category: 'strength', isCompound: true, instructions: ['Lie flat with eyes under the bar and shoulder blades retracted.', 'Grip slightly wider than shoulder-width and unrack.', 'Lower to mid-chest, then press to lockout.'], tips: 'Drive through your feet and keep elbows around 45 degrees.' },
  { id: 2, name: 'Barbell Back Squat', aliases: ['squat', 'back squat'], primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'hamstrings', 'core'], movementPattern: 'squat_hinge', equipment: 'barbell', category: 'strength', isCompound: true, instructions: ['Set the bar on your upper back with braced core.', 'Descend until hips break below knee depth.', 'Drive through mid-foot back to standing.'], tips: 'Keep knees tracking over toes and chest tall.' },
  { id: 3, name: 'Conventional Deadlift', aliases: ['dl', 'deadlift'], primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back', 'traps', 'forearms'], movementPattern: 'squat_hinge', equipment: 'barbell', category: 'strength', isCompound: true, instructions: ['Stand with mid-foot under the bar, hip-width stance.', 'Grip the bar and brace, shins vertical.', 'Push the floor away and extend hips to lockout.'], tips: 'Keep the bar close and your back flat throughout.' },
  { id: 4, name: 'Standing Overhead Press', aliases: ['ohp', 'press', 'military press'], primaryMuscle: 'shoulders', secondaryMuscles: ['triceps', 'traps'], movementPattern: 'vertical_push', equipment: 'barbell', category: 'strength', isCompound: true, instructions: ['Grip just outside shoulders with bar at upper chest.', 'Brace hard and press straight overhead.', 'Lock out over the ears with ribs down.'], tips: 'Squeeze glutes to avoid excessive lower-back arch.' },
  { id: 5, name: 'Barbell Bent-Over Row', aliases: ['row', 'bent row', 'pendlay row'], primaryMuscle: 'back', secondaryMuscles: ['biceps', 'shoulders'], movementPattern: 'horizontal_pull', equipment: 'barbell', category: 'strength', isCompound: true, instructions: ['Hinge to a flat back, torso around 45 degrees.', 'Pull the bar to your lower ribs.', 'Lower under control and reset each rep.'], tips: 'Lead with the elbows and keep the neck neutral.' },
  { id: 6, name: 'Pull-Up', aliases: ['pullup', 'pull up', 'chin'], primaryMuscle: 'back', secondaryMuscles: ['biceps', 'forearms'], movementPattern: 'vertical_pull', equipment: 'bodyweight', category: 'strength', isCompound: true, instructions: ['Hang from the bar with a shoulder-width overhand grip.', 'Pull your chest toward the bar.', 'Lower with control to a full hang.'], tips: 'Avoid swinging; initiate by driving elbows down.' },
  { id: 7, name: 'Romanian Deadlift', aliases: ['rdl'], primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], movementPattern: 'squat_hinge', equipment: 'barbell', category: 'strength', isCompound: true, instructions: ['Hold the bar at hips with soft knees.', 'Hinge back, pushing hips rearward.', 'Feel a hamstring stretch, then drive hips through.'], tips: 'Keep the bar grazing your legs; do not round the back.' },
  { id: 8, name: 'Lat Pulldown', aliases: ['pulldown', 'lat pull'], primaryMuscle: 'back', secondaryMuscles: ['biceps'], movementPattern: 'vertical_pull', equipment: 'cable', category: 'strength', isCompound: true, instructions: ['Grip the bar wider than shoulders.', 'Pull the bar to your upper chest.', 'Return slowly to a full stretch.'], tips: 'Drive elbows to the floor; do not lean back excessively.' },
  { id: 9, name: 'Seated Cable Row', aliases: ['cable row', 'seated row'], primaryMuscle: 'back', secondaryMuscles: ['biceps'], movementPattern: 'horizontal_pull', equipment: 'cable', category: 'strength', isCompound: true, instructions: ['Sit tall with a neutral spine and feet braced.', 'Pull the handle to your stomach, squeezing the back.', 'Return under control to a light stretch.'], tips: 'Keep shoulders down and away from your ears.' },
  { id: 10, name: 'Dumbbell Lateral Raise', aliases: ['lateral raise', 'side raise'], primaryMuscle: 'shoulders', secondaryMuscles: [], movementPattern: 'isolation', equipment: 'dumbbell', category: 'accessory', isCompound: false, instructions: ['Stand with dumbbells at your sides.', 'Raise the arms out to shoulder height.', 'Lower slowly with control.'], tips: 'Lead with the elbows and keep a slight bend.' },
  { id: 11, name: 'Dumbbell Bicep Curl', aliases: ['curl', 'bicep curl', 'db curl'], primaryMuscle: 'biceps', secondaryMuscles: ['forearms'], movementPattern: 'isolation', equipment: 'dumbbell', category: 'accessory', isCompound: false, instructions: ['Stand with dumbbells at your sides, palms forward.', 'Curl up while keeping elbows pinned.', 'Lower slowly to full extension.'], tips: 'Avoid swinging; control the negative.' },
  { id: 12, name: 'Triceps Cable Pushdown', aliases: ['pushdown', 'tricep pushdown', 'triceps'], primaryMuscle: 'triceps', secondaryMuscles: [], movementPattern: 'isolation', equipment: 'cable', category: 'accessory', isCompound: false, instructions: ['Stand at the cable with elbows tucked.', 'Push the bar down to full extension.', 'Return slowly to 90 degrees.'], tips: 'Keep elbows fixed; only the forearms should move.' },
  { id: 13, name: 'Leg Press', aliases: ['leg press', 'press'], primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], movementPattern: 'squat_hinge', equipment: 'machine', category: 'strength', isCompound: true, instructions: ['Set feet shoulder-width on the platform.', 'Lower to around 90 degrees of knee flexion.', 'Press through the whole foot to extension.'], tips: 'Do not lock the knees or let the lower back round.' },
  { id: 14, name: 'Cable Face Pull', aliases: ['face pull', 'facepull'], primaryMuscle: 'shoulders', secondaryMuscles: ['traps', 'back'], movementPattern: 'horizontal_pull', equipment: 'cable', category: 'accessory', isCompound: false, instructions: ['Set the cable at face height with a rope.', 'Pull toward your face, elbows high.', 'Squeeze the rear delts and return slowly.'], tips: 'Use a light load for clean reps and posture work.' },
];

interface SeedTemplateExercise {
  exerciseId: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  notes: string;
}

interface SeedTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  exercises: SeedTemplateExercise[];
}

const TEMPLATES: SeedTemplate[] = [
  { id: 1, name: 'Full Body A', description: 'Foundational strength session hitting the big movers.', category: 'strength', difficulty: 'beginner', estimatedMinutes: 50, exercises: [{ exerciseId: 2, targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, restSeconds: 180, notes: '' }, { exerciseId: 1, targetSets: 3, targetRepsMin: 5, targetRepsMax: 6, restSeconds: 150, notes: '' }, { exerciseId: 5, targetSets: 3, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 120, notes: '' }] },
  { id: 2, name: 'Full Body B', description: 'Complementary full body day with a pull and press bias.', category: 'strength', difficulty: 'beginner', estimatedMinutes: 50, exercises: [{ exerciseId: 4, targetSets: 3, targetRepsMin: 5, targetRepsMax: 6, restSeconds: 150, notes: '' }, { exerciseId: 3, targetSets: 1, targetRepsMin: 5, targetRepsMax: 5, restSeconds: 180, notes: '' }, { exerciseId: 8, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 90, notes: '' }] },
  { id: 3, name: 'Push Day', description: 'Chest, shoulders and triceps focus for a PPL split.', category: 'strength', difficulty: 'intermediate', estimatedMinutes: 60, exercises: [{ exerciseId: 1, targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, restSeconds: 150, notes: '' }, { exerciseId: 4, targetSets: 3, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 120, notes: '' }, { exerciseId: 10, targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60, notes: '' }, { exerciseId: 12, targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60, notes: '' }] },
  { id: 4, name: 'Pull Day', description: 'Back and biceps focus for a PPL split.', category: 'strength', difficulty: 'intermediate', estimatedMinutes: 55, exercises: [{ exerciseId: 5, targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 120, notes: '' }, { exerciseId: 6, targetSets: 3, targetRepsMin: 6, targetRepsMax: 10, restSeconds: 90, notes: '' }, { exerciseId: 9, targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 75, notes: '' }, { exerciseId: 11, targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 60, notes: '' }] },
  { id: 5, name: 'Leg Day', description: 'Quad, hamstring and glute focus for a PPL split.', category: 'strength', difficulty: 'intermediate', estimatedMinutes: 55, exercises: [{ exerciseId: 2, targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, restSeconds: 180, notes: '' }, { exerciseId: 7, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120, notes: '' }, { exerciseId: 13, targetSets: 3, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 90, notes: '' }, { exerciseId: 14, targetSets: 3, targetRepsMin: 15, targetRepsMax: 20, restSeconds: 45, notes: '' }] },
  { id: 6, name: 'Upper Body', description: 'Balanced upper session mixing pushes and pulls.', category: 'strength', difficulty: 'intermediate', estimatedMinutes: 55, exercises: [{ exerciseId: 1, targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, restSeconds: 150, notes: '' }, { exerciseId: 5, targetSets: 4, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 120, notes: '' }, { exerciseId: 4, targetSets: 3, targetRepsMin: 6, targetRepsMax: 8, restSeconds: 120, notes: '' }, { exerciseId: 8, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 90, notes: '' }, { exerciseId: 11, targetSets: 2, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60, notes: '' }, { exerciseId: 12, targetSets: 2, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60, notes: '' }] },
];

interface SeedProgram {
  id: number;
  name: string;
  description: string;
  weeks: number;
  days: { week: number; day: number; templateId: number }[];
}

const PROGRAMS: SeedProgram[] = [
  { id: 1, name: 'Push / Pull / Legs', description: 'A classic 6-day split built for hypertrophy and strength.', weeks: 4, days: [{ week: 1, day: 1, templateId: 3 }, { week: 1, day: 2, templateId: 4 }, { week: 1, day: 3, templateId: 5 }] },
  { id: 2, name: 'Upper / Lower', description: 'A balanced 4-day split for steady progression.', weeks: 4, days: [{ week: 1, day: 1, templateId: 6 }, { week: 1, day: 2, templateId: 5 }, { week: 1, day: 4, templateId: 6 }, { week: 1, day: 5, templateId: 2 }] },
];

/** Baseline working weights in kg used to generate a realistic history. */
const BASELINE: Record<number, number> = { 1: 60, 2: 80, 3: 100, 4: 40, 5: 55, 6: 0, 7: 70, 8: 50, 9: 55, 10: 9, 11: 12, 12: 25, 13: 120, 14: 20 };

const DAY_MS = 86_400_000;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Seed the catalog (exercises, templates, programs) and a realistic ~8 week
 * training history, then a default profile. Runs once, guarded by schema_meta.
 */
export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (const ex of EXERCISES) {
      await db.runAsync(
        `INSERT INTO exercises (id, name, primary_muscle, movement_pattern, equipment, category, is_compound, tips, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ex.id, ex.name, ex.primaryMuscle, ex.movementPattern, ex.equipment, ex.category, ex.isCompound ? 1 : 0, ex.tips, now, now,
      );
      for (const alias of ex.aliases) {
        await db.runAsync(`INSERT INTO exercise_aliases (exercise_id, alias) VALUES (?, ?)`, ex.id, alias.toLowerCase());
      }
      for (const muscle of ex.secondaryMuscles) {
        await db.runAsync(`INSERT INTO exercise_secondary_muscles (exercise_id, muscle) VALUES (?, ?)`, ex.id, muscle);
      }
      for (let i = 0; i < ex.instructions.length; i++) {
        await db.runAsync(`INSERT INTO exercise_instructions (exercise_id, step, text) VALUES (?, ?, ?)`, ex.id, i + 1, ex.instructions[i]);
      }
    }

    for (const t of TEMPLATES) {
      await db.runAsync(
        `INSERT INTO workout_templates (id, name, description, category, difficulty, estimated_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id, t.name, t.description, t.category, t.difficulty, t.estimatedMinutes, now, now,
      );
      for (let i = 0; i < t.exercises.length; i++) {
        const te = t.exercises[i];
        await db.runAsync(
          `INSERT INTO template_exercises (template_id, exercise_id, sort_order, target_sets, target_reps_min, target_reps_max, rest_seconds, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          t.id, te.exerciseId, i, te.targetSets, te.targetRepsMin, te.targetRepsMax, te.restSeconds, te.notes,
        );
      }
    }

    for (const p of PROGRAMS) {
      await db.runAsync(
        `INSERT INTO programs (id, name, description, weeks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        p.id, p.name, p.description, p.weeks, now, now,
      );
      for (let i = 0; i < p.days.length; i++) {
        const d = p.days[i];
        await db.runAsync(
          `INSERT INTO program_workouts (program_id, template_id, week, day, sort_order) VALUES (?, ?, ?, ?, ?)`,
          p.id, d.templateId, d.week, d.day, i,
        );
      }
      // Repeat the week-1 pattern across the remaining program weeks.
      for (let w = 2; w <= p.weeks; w++) {
        for (let i = 0; i < p.days.length; i++) {
          const d = p.days[i];
          await db.runAsync(
            `INSERT INTO program_workouts (program_id, template_id, week, day, sort_order) VALUES (?, ?, ?, ?, ?)`,
            p.id, d.templateId, w, d.day, i,
          );
        }
      }
    }

    await generateHistory(db, now);

    await db.runAsync(
      `INSERT INTO user_profile (id, name, goal, bodyweight, unit, onboarding_completed, updated_at) VALUES (1, '', 'build_muscle', NULL, 'metric', 0, ?)`,
      now,
    );
  });
}

async function generateHistory(db: SQLiteDatabase, now: number): Promise<void> {
  const sessionCount = 25;
  for (let i = 0; i < sessionCount; i++) {
    const templateId = (i % 6) + 1;
    const tmpl = TEMPLATES.find((t) => t.id === templateId)!;
    const startedAt = now - (sessionCount - 1 - i) * 2 * DAY_MS;
    const durationSeconds = 2400 + ((i * 97) % 1200);
    const endedAt = startedAt + durationSeconds;

    let totalVolume = 0;
    const setRows: { exerciseId: number; setIndex: number; weight: number; reps: number }[] = [];

    for (const te of tmpl.exercises) {
      const base = BASELINE[te.exerciseId] ?? 0;
      for (let s = 0; s < te.targetSets; s++) {
        const progression = 1 + i * 0.012;
        const weight = base > 0 ? roundTo(base * progression, 2.5) : 0;
        const repRange = Math.max(1, te.targetRepsMax - te.targetRepsMin + 1);
        const reps = te.targetRepsMin + ((i + s) % repRange);
        totalVolume += weight * reps;
        setRows.push({ exerciseId: te.exerciseId, setIndex: s, weight, reps });
      }
    }

    const res = await db.runAsync(
      `INSERT INTO workout_logs (template_id, name, started_at, ended_at, duration_seconds, total_volume, unit, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'metric', '', ?, ?)`,
      templateId, tmpl.name, startedAt, endedAt, durationSeconds, Math.round(totalVolume * 100) / 100, startedAt, endedAt,
    );
    const logId = res.lastInsertRowId as number;
    for (const sr of setRows) {
      await db.runAsync(
        `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, rest_seconds, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        logId, sr.exerciseId, sr.setIndex, sr.weight, sr.reps, 90, endedAt,
      );
    }
  }
}
