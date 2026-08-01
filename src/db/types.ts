export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'traps'
  | 'full_body';

export type MovementPattern =
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'squat_hinge'
  | 'isolation'
  | 'carry'
  | 'core';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'kettlebell'
  | 'bodyweight'
  | 'band'
  | 'other';

export type Category = 'strength' | 'cardio' | 'mobility' | 'accessory';
export type Goal = 'build_muscle' | 'gain_strength' | 'lose_fat' | 'improve_endurance';
export type Unit = 'metric' | 'imperial';
export type ThemeMode = 'system' | 'light' | 'dark';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: number;
  name: string;
  aliases: string[];
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  movementPattern: MovementPattern | null;
  equipment: Equipment;
  category: Category;
  isCompound: boolean;
  isCustom: boolean;
  source: 'seed' | 'exercisedb' | 'custom';
  externalId: string | null;
  difficulty: string | null;
  defaultRestSeconds: number;
  instructions: string[];
  tips: string | null;
  imageUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TemplateExercise {
  id: number;
  templateId: number;
  exerciseId: number;
  sortOrder: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
  notes: string;
  /** Joined exercise (populated by queries). */
  exercise?: Exercise;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  createdAt: number;
  updatedAt: number;
  /** Joined exercises ordered by sort_order (populated by queries). */
  exercises?: TemplateExercise[];
}

export interface ProgramWorkout {
  id: number;
  programId: number;
  templateId: number;
  week: number;
  day: number;
  sortOrder: number;
  templateName?: string;
  estimatedMinutes?: number;
  template?: WorkoutTemplate;
}

export interface Program {
  id: number;
  name: string;
  description: string;
  weeks: number;
  createdAt: number;
  updatedAt: number;
  workouts?: ProgramWorkout[];
}

export interface SetEntry {
  id: number;
  workoutLogId: number;
  exerciseId: number;
  setIndex: number;
  weight: number;
  reps: number;
  completed: boolean;
  restSeconds: number | null;
  createdAt: number;
}

export interface WorkoutLog {
  id: number;
  templateId: number | null;
  name: string;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  totalVolume: number;
  unit: Unit;
  notes: string;
  createdAt: number;
  updatedAt: number;
  /** Derived: true when endedAt is set. */
  isComplete: boolean;
  /** Joined sets (populated when requested). */
  sets?: SetEntry[];
}

export interface UserProfile {
  id: number;
  name: string;
  goal: Goal;
  bodyweight: number | null;
  unit: Unit;
  experienceLevel: ExperienceLevel;
  onboardingCompleted: boolean;
  avatarUrl: string | null;
  updatedAt: number;
}

export interface Settings {
  unit: Unit;
  themeMode: ThemeMode;
  hapticsEnabled: boolean;
}

/* ---- Query result shapes ---- */

export interface ExerciseHistoryRow {
  workoutLogId: number;
  workoutName: string;
  startedAt: number;
  setIndex: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface PR {
  exerciseId: number;
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  estimated1RM: number;
  bestSetVolume: number;
  achievedAt: number;
}

export interface WeeklyVolume {
  weekStart: string;
  volume: number;
  sessions: number;
}

export interface MuscleDistribution {
  muscle: MuscleGroup;
  sets: number;
  volume: number;
}

export interface ProgressStats {
  totalSessions: number;
  totalVolume: number;
  totalSets: number;
  streak: number;
  weeklyVolume: WeeklyVolume[];
  muscleDistribution: MuscleDistribution[];
  prs: PR[];
  lastSessionAt: number | null;
}

export interface SearchHit {
  exercise: Exercise;
  /** Higher is more relevant. */
  score: number;
  /** Why it matched, for debugging/UX. */
  matchedOn: 'name' | 'alias' | 'muscle' | 'equipment' | 'pattern' | 'category';
}

export interface Paginated<T> {
  items: T[];
  nextOffset: number | null;
}

/** Workout log with all sets and exercise info joined. */
export interface WorkoutLogWithDetails extends WorkoutLog {
  sets: SetEntry[];
  template?: WorkoutTemplate;
}
