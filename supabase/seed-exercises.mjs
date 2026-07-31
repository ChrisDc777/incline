/**
 * Seed Supabase with a comprehensive exercise library.
 * Covers all muscle groups, equipment types, and movement patterns.
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node supabase/seed-exercises.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXERCISES = [
  // ===== CHEST =====
  { name:'Barbell Bench Press', body_part:'chest', equipment:'barbell', target_muscle:'pectorals', secondary_muscles:['triceps','shoulders'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Incline Barbell Bench Press', body_part:'chest', equipment:'barbell', target_muscle:'pectorals', secondary_muscles:['shoulders','triceps'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Decline Barbell Bench Press', body_part:'chest', equipment:'barbell', target_muscle:'pectorals', secondary_muscles:['triceps','shoulders'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Dumbbell Bench Press', body_part:'chest', equipment:'dumbbell', target_muscle:'pectorals', secondary_muscles:['triceps','shoulders'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Incline Dumbbell Bench Press', body_part:'chest', equipment:'dumbbell', target_muscle:'pectorals', secondary_muscles:['shoulders','triceps'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Dumbbell Flyes', body_part:'chest', equipment:'dumbbell', target_muscle:'pectorals', secondary_muscles:['shoulders'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Incline Dumbbell Flyes', body_part:'chest', equipment:'dumbbell', target_muscle:'pectorals', secondary_muscles:['shoulders'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Cable Crossover', body_part:'chest', equipment:'cable', target_muscle:'pectorals', secondary_muscles:['shoulders'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Low Cable Crossover', body_part:'chest', equipment:'cable', target_muscle:'pectorals', secondary_muscles:['shoulders'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Chest Press Machine', body_part:'chest', equipment:'machine', target_muscle:'pectorals', secondary_muscles:['triceps','shoulders'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Push Ups', body_part:'chest', equipment:'bodyweight', target_muscle:'pectorals', secondary_muscles:['triceps','shoulders','core'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Incline Push Ups', body_part:'chest', equipment:'bodyweight', target_muscle:'pectorals', secondary_muscles:['triceps','shoulders'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Decline Push Ups', body_part:'chest', equipment:'bodyweight', target_muscle:'pectorals', secondary_muscles:['triceps','shoulders','core'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Dips', body_part:'chest', equipment:'bodyweight', target_muscle:'pectorals', secondary_muscles:['triceps','shoulders'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Landmine Press', body_part:'chest', equipment:'barbell', target_muscle:'pectorals', secondary_muscles:['shoulders','triceps'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'intermediate' },

  // ===== BACK =====
  { name:'Barbell Bent Over Row', body_part:'back', equipment:'barbell', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids','core'], movement_pattern:'horizontal_pull', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Pendlay Row', body_part:'back', equipment:'barbell', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'horizontal_pull', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'T Bar Row', body_part:'back', equipment:'barbell', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'horizontal_pull', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'One Arm Dumbbell Row', body_part:'back', equipment:'dumbbell', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'horizontal_pull', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Dumbbell Row', body_part:'back', equipment:'dumbbell', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'horizontal_pull', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Seated Cable Row', body_part:'back', equipment:'cable', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'horizontal_pull', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Lat Pulldown', body_part:'back', equipment:'cable', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'vertical_pull', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Close Grip Lat Pulldown', body_part:'back', equipment:'cable', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'vertical_pull', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Pull Ups', body_part:'back', equipment:'bodyweight', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids','core'], movement_pattern:'vertical_pull', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Chin Ups', body_part:'back', equipment:'bodyweight', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'vertical_pull', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Neutral Grip Pull Up', body_part:'back', equipment:'bodyweight', target_muscle:'lats', secondary_muscles:['biceps','forearms'], movement_pattern:'vertical_pull', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Assisted Pull Up', body_part:'back', equipment:'machine', target_muscle:'lats', secondary_muscles:['biceps'], movement_pattern:'vertical_pull', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Straight Arm Pulldown', body_part:'back', equipment:'cable', target_muscle:'lats', secondary_muscles:['triceps'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Rack Pull', body_part:'back', equipment:'barbell', target_muscle:'traps', secondary_muscles:['glutes','hamstrings','forearms'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Barbell Shrug', body_part:'back', equipment:'barbell', target_muscle:'traps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Dumbbell Shrug', body_part:'back', equipment:'dumbbell', target_muscle:'traps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },

  // ===== SHOULDERS =====
  { name:'Overhead Press', body_part:'shoulders', equipment:'barbell', target_muscle:'shoulders', secondary_muscles:['triceps','core'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Push Press', body_part:'shoulders', equipment:'barbell', target_muscle:'shoulders', secondary_muscles:['triceps','core','legs'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Dumbbell Shoulder Press', body_part:'shoulders', equipment:'dumbbell', target_muscle:'shoulders', secondary_muscles:['triceps'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Arnold Press', body_part:'shoulders', equipment:'dumbbell', target_muscle:'shoulders', secondary_muscles:['triceps'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Lateral Raise', body_part:'shoulders', equipment:'dumbbell', target_muscle:'shoulders', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Cable Lateral Raise', body_part:'shoulders', equipment:'cable', target_muscle:'shoulders', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Front Raise', body_part:'shoulders', equipment:'dumbbell', target_muscle:'shoulders', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Rear Delt Flyes', body_part:'shoulders', equipment:'dumbbell', target_muscle:'shoulders', secondary_muscles:['rear deltoids'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Face Pull', body_part:'shoulders', equipment:'cable', target_muscle:'shoulders', secondary_muscles:['rear deltoids','traps'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Reverse Pec Deck', body_part:'shoulders', equipment:'machine', target_muscle:'shoulders', secondary_muscles:['rear deltoids'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Upright Row', body_part:'shoulders', equipment:'barbell', target_muscle:'shoulders', secondary_muscles:['biceps','traps'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Lu Raise', body_part:'shoulders', equipment:'dumbbell', target_muscle:'shoulders', secondary_muscles:['traps'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'intermediate' },
  { name:'Bradford Press', body_part:'shoulders', equipment:'barbell', target_muscle:'shoulders', secondary_muscles:['triceps'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'advanced' },

  // ===== BICEPS =====
  { name:'Barbell Curl', body_part:'upper arms', equipment:'barbell', target_muscle:'biceps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'EZ Bar Curl', body_part:'upper arms', equipment:'barbell', target_muscle:'biceps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Dumbbell Curl', body_part:'upper arms', equipment:'dumbbell', target_muscle:'biceps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Hammer Curl', body_part:'upper arms', equipment:'dumbbell', target_muscle:'biceps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Incline Dumbbell Curl', body_part:'upper arms', equipment:'dumbbell', target_muscle:'biceps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Concentration Curl', body_part:'upper arms', equipment:'dumbbell', target_muscle:'biceps', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Cable Curl', body_part:'upper arms', equipment:'cable', target_muscle:'biceps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Preacher Curl', body_part:'upper arms', equipment:'barbell', target_muscle:'biceps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Spider Curl', body_part:'upper arms', equipment:'dumbbell', target_muscle:'biceps', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'intermediate' },
  { name:'Zottman Curl', body_part:'upper arms', equipment:'dumbbell', target_muscle:'biceps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'intermediate' },

  // ===== TRICEPS =====
  { name:'Close Grip Bench Press', body_part:'upper arms', equipment:'barbell', target_muscle:'triceps', secondary_muscles:['chest','shoulders'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Tricep Pushdown', body_part:'upper arms', equipment:'cable', target_muscle:'triceps', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Overhead Tricep Extension', body_part:'upper arms', equipment:'cable', target_muscle:'triceps', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Dumbbell Tricep Extension', body_part:'upper arms', equipment:'dumbbell', target_muscle:'triceps', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Skull Crushers', body_part:'upper arms', equipment:'barbell', target_muscle:'triceps', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'intermediate' },
  { name:'Tricep Dip Machine', body_part:'upper arms', equipment:'machine', target_muscle:'triceps', secondary_muscles:['chest','shoulders'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Bench Dips', body_part:'upper arms', equipment:'bodyweight', target_muscle:'triceps', secondary_muscles:['chest','shoulders'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Diamond Push Ups', body_part:'upper arms', equipment:'bodyweight', target_muscle:'triceps', secondary_muscles:['chest','shoulders'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Kickbacks', body_part:'upper arms', equipment:'dumbbell', target_muscle:'triceps', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },

  // ===== LEGS - QUADS =====
  { name:'Back Squat', body_part:'upper legs', equipment:'barbell', target_muscle:'quads', secondary_muscles:['glutes','hamstrings','core'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Front Squat', body_part:'upper legs', equipment:'barbell', target_muscle:'quads', secondary_muscles:['glutes','core'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Goblet Squat', body_part:'upper legs', equipment:'dumbbell', target_muscle:'quads', secondary_muscles:['glutes','core'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Leg Press', body_part:'upper legs', equipment:'machine', target_muscle:'quads', secondary_muscles:['glutes','hamstrings'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Leg Extension', body_part:'upper legs', equipment:'machine', target_muscle:'quads', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Walking Lunges', body_part:'upper legs', equipment:'dumbbell', target_muscle:'quads', secondary_muscles:['glutes','hamstrings'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Reverse Lunges', body_part:'upper legs', equipment:'dumbbell', target_muscle:'quads', secondary_muscles:['glutes','hamstrings'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Bulgarian Split Squat', body_part:'upper legs', equipment:'dumbbell', target_muscle:'quads', secondary_muscles:['glutes','hamstrings'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Hack Squat', body_part:'upper legs', equipment:'machine', target_muscle:'quads', secondary_muscles:['glutes'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Wall Sit', body_part:'upper legs', equipment:'bodyweight', target_muscle:'quads', secondary_muscles:['glutes'], movement_pattern:'squat_hinge', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Sissy Squat', body_part:'upper legs', equipment:'bodyweight', target_muscle:'quads', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'advanced' },
  { name:'Pistol Squat', body_part:'upper legs', equipment:'bodyweight', target_muscle:'quads', secondary_muscles:['glutes','core'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'advanced' },
  { name:'Step Ups', body_part:'upper legs', equipment:'dumbbell', target_muscle:'quads', secondary_muscles:['glutes','hamstrings'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'beginner' },

  // ===== LEGS - HAMSTRINGS =====
  { name:'Romanian Deadlift', body_part:'upper legs', equipment:'barbell', target_muscle:'hamstrings', secondary_muscles:['glutes','lower back'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Stiff Leg Deadlift', body_part:'upper legs', equipment:'barbell', target_muscle:'hamstrings', secondary_muscles:['glutes','lower back'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Dumbbell Romanian Deadlift', body_part:'upper legs', equipment:'dumbbell', target_muscle:'hamstrings', secondary_muscles:['glutes','lower back'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Leg Curl', body_part:'upper legs', equipment:'machine', target_muscle:'hamstrings', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Nordic Hamstring Curl', body_part:'upper legs', equipment:'bodyweight', target_muscle:'hamstrings', secondary_muscles:['calves'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'advanced' },
  { name:'Good Mornings', body_part:'upper legs', equipment:'barbell', target_muscle:'hamstrings', secondary_muscles:['lower back','glutes'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Single Leg Romanian Deadlift', body_part:'upper legs', equipment:'dumbbell', target_muscle:'hamstrings', secondary_muscles:['glutes','core'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Glute Ham Raise', body_part:'upper legs', equipment:'bodyweight', target_muscle:'hamstrings', secondary_muscles:['glutes','lower back'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'advanced' },

  // ===== LEGS - GLUTES =====
  { name:'Barbell Hip Thrust', body_part:'upper legs', equipment:'barbell', target_muscle:'glutes', secondary_muscles:['hamstrings','core'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Glute Bridge', body_part:'upper legs', equipment:'bodyweight', target_muscle:'glutes', secondary_muscles:['hamstrings'], movement_pattern:'squat_hinge', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Cable Kickback', body_part:'upper legs', equipment:'cable', target_muscle:'glutes', secondary_muscles:['hamstrings'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Sumo Deadlift', body_part:'upper legs', equipment:'barbell', target_muscle:'glutes', secondary_muscles:['quads','hamstrings','lower back'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Banded Clamshells', body_part:'upper legs', equipment:'band', target_muscle:'glutes', secondary_muscles:['hip abductors'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },

  // ===== LEGS - CALVES =====
  { name:'Standing Calf Raise', body_part:'lower legs', equipment:'machine', target_muscle:'calves', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Seated Calf Raise', body_part:'lower legs', equipment:'machine', target_muscle:'calves', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Single Leg Calf Raise', body_part:'lower legs', equipment:'bodyweight', target_muscle:'calves', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Donkey Calf Raise', body_part:'lower legs', equipment:'bodyweight', target_muscle:'calves', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },

  // ===== CORE =====
  { name:'Plank', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:['shoulders','glutes'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Side Plank', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:['obliques'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Crunches', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:[], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Hanging Leg Raise', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:['hip flexors'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'intermediate' },
  { name:'Cable Crunch', body_part:'waist', equipment:'cable', target_muscle:'core', secondary_muscles:[], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Ab Wheel Rollout', body_part:'waist', equipment:'other', target_muscle:'core', secondary_muscles:['shoulders','lats'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'intermediate' },
  { name:'Dead Bug', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:['hip flexors'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Bird Dog', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:['lower back','glutes'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Russian Twist', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:['obliques'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Woodchopper', body_part:'waist', equipment:'cable', target_muscle:'core', secondary_muscles:['obliques','shoulders'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'intermediate' },
  { name:'Lying Leg Raise', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:['hip flexors'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Cable Pallof Press', body_part:'waist', equipment:'cable', target_muscle:'core', secondary_muscles:['obliques'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'intermediate' },
  { name:'Mountain Climbers', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:['shoulders','hip flexors'], movement_pattern:'core', category:'cardio', is_compound:true, difficulty:'beginner' },
  { name:'Toe Touches', body_part:'waist', equipment:'bodyweight', target_muscle:'core', secondary_muscles:['hip flexors'], movement_pattern:'core', category:'accessory', is_compound:false, difficulty:'beginner' },

  // ===== FOREARMS =====
  { name:'Wrist Curl', body_part:'lower arms', equipment:'barbell', target_muscle:'forearms', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Reverse Wrist Curl', body_part:'lower arms', equipment:'barbell', target_muscle:'forearms', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Farmers Walk', body_part:'lower arms', equipment:'dumbbell', target_muscle:'forearms', secondary_muscles:['traps','core','shoulders'], movement_pattern:'isolation', category:'accessory', is_compound:true, difficulty:'beginner' },
  { name:'Dead Hang', body_part:'lower arms', equipment:'bodyweight', target_muscle:'forearms', secondary_muscles:['shoulders'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Plate Pinch Hold', body_part:'lower arms', equipment:'other', target_muscle:'forearms', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },

  // ===== FULL BODY / COMPOUNDS =====
  { name:'Deadlift', body_part:'upper legs', equipment:'barbell', target_muscle:'hamstrings', secondary_muscles:['glutes','lower back','traps','forearms'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Clean and Press', body_part:'shoulders', equipment:'barbell', target_muscle:'shoulders', secondary_muscles:['quads','glutes','hamstrings','traps','triceps'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'advanced' },
  { name:'Hang Clean', body_part:'upper legs', equipment:'barbell', target_muscle:'quads', secondary_muscles:['glutes','hamstrings','traps','shoulders'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'advanced' },
  { name:'Power Clean', body_part:'upper legs', equipment:'barbell', target_muscle:'quads', secondary_muscles:['glutes','hamstrings','traps','shoulders'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'advanced' },
  { name:'Snatch', body_part:'upper legs', equipment:'barbell', target_muscle:'quads', secondary_muscles:['glutes','hamstrings','shoulders','traps','core'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'advanced' },
  { name:'Thruster', body_part:'upper legs', equipment:'barbell', target_muscle:'quads', secondary_muscles:['shoulders','glutes','triceps'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Burpee', body_part:'chest', equipment:'bodyweight', target_muscle:'chest', secondary_muscles:['quads','shoulders','triceps','core'], movement_pattern:'horizontal_push', category:'cardio', is_compound:true, difficulty:'intermediate' },
  { name:'Turkish Get Up', body_part:'shoulders', equipment:'dumbbell', target_muscle:'shoulders', secondary_muscles:['core','glutes','quads'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'advanced' },
  { name:'Kettlebell Swing', body_part:'upper legs', equipment:'kettlebell', target_muscle:'glutes', secondary_muscles:['hamstrings','core','shoulders'], movement_pattern:'squat_hinge', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Man Maker', body_part:'chest', equipment:'dumbbell', target_muscle:'chest', secondary_muscles:['shoulders','quads','back','triceps'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'advanced' },

  // ===== ADDITIONAL ISOLATION =====
  { name:'Calf Raise on Leg Press', body_part:'lower legs', equipment:'machine', target_muscle:'calves', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Hip Abduction Machine', body_part:'upper legs', equipment:'machine', target_muscle:'glutes', secondary_muscles:['hip abductors'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Hip Adduction Machine', body_part:'upper legs', equipment:'machine', target_muscle:'core', secondary_muscles:['hip flexors'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Cable Pull Through', body_part:'upper legs', equipment:'cable', target_muscle:'glutes', secondary_muscles:['hamstrings'], movement_pattern:'squat_hinge', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Machine Chest Fly', body_part:'chest', equipment:'machine', target_muscle:'pectorals', secondary_muscles:['shoulders'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Pec Deck', body_part:'chest', equipment:'machine', target_muscle:'pectorals', secondary_muscles:['shoulders'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Seated Dumbbell Shoulder Press', body_part:'shoulders', equipment:'dumbbell', target_muscle:'shoulders', secondary_muscles:['triceps'], movement_pattern:'vertical_push', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Cable Lateral Raise', body_part:'shoulders', equipment:'cable', target_muscle:'shoulders', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Dumbbell Pullover', body_part:'back', equipment:'dumbbell', target_muscle:'lats', secondary_muscles:['chest','triceps'], movement_pattern:'vertical_pull', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Meadows Row', body_part:'back', equipment:'barbell', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'horizontal_pull', category:'strength', is_compound:true, difficulty:'intermediate' },
  { name:'Chest Supported Dumbbell Row', body_part:'back', equipment:'dumbbell', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'horizontal_pull', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Machine Row', body_part:'back', equipment:'machine', target_muscle:'lats', secondary_muscles:['biceps','rear deltoids'], movement_pattern:'horizontal_pull', category:'strength', is_compound:true, difficulty:'beginner' },
  { name:'Incline Dumbbell Curl', body_part:'upper arms', equipment:'dumbbell', target_muscle:'biceps', secondary_muscles:['forearms'], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'Bayesian Curl', body_part:'upper arms', equipment:'cable', target_muscle:'biceps', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'intermediate' },
  { name:'Overhead Dumbbell Extension', body_part:'upper arms', equipment:'dumbbell', target_muscle:'triceps', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
  { name:'JM Press', body_part:'upper arms', equipment:'barbell', target_muscle:'triceps', secondary_muscles:['chest'], movement_pattern:'horizontal_push', category:'strength', is_compound:true, difficulty:'advanced' },
  { name:'Leg Press Calf Raise', body_part:'lower legs', equipment:'machine', target_muscle:'calves', secondary_muscles:[], movement_pattern:'isolation', category:'accessory', is_compound:false, difficulty:'beginner' },
];

async function main() {
  const rows = EXERCISES.map((ex, i) => ({
    external_id: `seed_${i + 1}`,
    name: ex.name,
    body_part: ex.body_part,
    equipment: ex.equipment,
    target_muscle: ex.target_muscle,
    secondary_muscles: ex.secondary_muscles,
    movement_pattern: ex.movement_pattern,
    category: ex.category,
    is_compound: ex.is_compound,
    difficulty: ex.difficulty,
    instructions: [],
    gif_url: '',
  }));

  console.log(`Seeding ${rows.length} exercises...`);

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from('exercises').upsert(batch, { onConflict: 'external_id' });
    if (error) {
      console.error(`Batch ${i}-${i + batch.length} error:`, error.message);
    } else {
      console.log(`Inserted ${Math.min(i + 50, rows.length)}/${rows.length}`);
    }
  }

  const { count } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
  console.log(`\nDone! Total exercises in Supabase: ${count}`);
}

main().catch(console.error);
