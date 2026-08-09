import type { MuscleGroup } from '@/db/types';

/**
 * Fixed hexagon axes for the balance radar.
 * Composites fold secondary groups so the shape stays stable while still
 * reflecting most training (zeros for unworked axes).
 */
export const MUSCLE_RADAR_AXES: {
  key: string;
  label: string;
  muscles: MuscleGroup[];
}[] = [
  { key: 'chest', label: 'Chest', muscles: ['chest'] },
  { key: 'back', label: 'Back', muscles: ['back', 'traps'] },
  { key: 'shoulders', label: 'Shoulders', muscles: ['shoulders'] },
  { key: 'arms', label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { key: 'quads', label: 'Quads', muscles: ['quads', 'calves'] },
  { key: 'hinge', label: 'Hinge', muscles: ['hamstrings', 'glutes', 'core'] },
];

export function sumSetsForMuscles(
  distribution: { muscle: MuscleGroup; sets: number }[],
  muscles: MuscleGroup[],
): number {
  const wanted = new Set(muscles);
  let total = 0;
  for (const d of distribution) {
    if (wanted.has(d.muscle)) total += d.sets;
  }
  return total;
}
