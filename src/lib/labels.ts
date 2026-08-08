import type {
  Category,
  Difficulty,
  Equipment,
  ExperienceLevel,
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

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Fallback palette used when no accent-aware palette is provided. */
export const CHART_PALETTE = [
  '#6D5DF6',
  '#F59E0B',
  '#A78BFA',
  '#F87171',
  '#64748B',
  '#0F766E',
  '#FBBF24',
  '#C4B5FD',
  '#FB7185',
  '#94A3B8',
  '#2DD4BF',
  '#EAB308',
  '#8B5CF6',
];

const MUSCLE_ORDER: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads',
  'hamstrings', 'glutes', 'calves', 'core', 'forearms', 'traps', 'full_body',
];

export function muscleColor(muscle: MuscleGroup, palette: string[] = CHART_PALETTE): string {
  const idx = MUSCLE_ORDER.indexOf(muscle);
  const safe = idx >= 0 ? idx : 0;
  return palette[safe % palette.length];
}
