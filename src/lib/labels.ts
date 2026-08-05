import type {
  Category,
  Difficulty,
  Equipment,
  Goal,
  MovementPattern,
  MuscleGroup,
} from '@/db/types';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
  traps: 'Traps',
  full_body: 'Full Body',
};

export const MOVEMENT_LABELS: Record<MovementPattern, string> = {
  horizontal_push: 'Horizontal Push',
  vertical_push: 'Vertical Push',
  horizontal_pull: 'Horizontal Pull',
  vertical_pull: 'Vertical Pull',
  squat_hinge: 'Squat / Hinge',
  isolation: 'Isolation',
  carry: 'Carry',
  core: 'Core',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  kettlebell: 'Kettlebell',
  bodyweight: 'Bodyweight',
  band: 'Band',
  other: 'Other',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  mobility: 'Mobility',
  accessory: 'Accessory',
};

export const GOAL_LABELS: Record<Goal, string> = {
  build_muscle: 'Build Muscle',
  gain_strength: 'Gain Strength',
  lose_fat: 'Lose Fat',
  improve_endurance: 'Improve Endurance',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Palette used by charts, cycling by index. First slot follows brand indigo. */
export const CHART_PALETTE = [
  '#6D5DF6',
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#ec4899',
  '#8b5cf6',
  '#f97316',
  '#06b6d4',
  '#84cc16',
  '#eab308',
  '#64748b',
];

export function muscleColor(muscle: MuscleGroup): string {
  const order: MuscleGroup[] = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads',
    'hamstrings', 'glutes', 'calves', 'core', 'forearms', 'traps', 'full_body',
  ];
  return CHART_PALETTE[order.indexOf(muscle) % CHART_PALETTE.length];
}
