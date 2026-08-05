import { openDatabase } from '../client';
import type { ExperienceLevel, Goal, Unit, UserProfile } from '../types';
import {
  mapProfile,
  type ProfileRow,
} from './helpers';

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
