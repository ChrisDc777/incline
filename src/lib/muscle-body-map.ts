import type { Slug } from 'react-native-body-highlighter';

import type { MuscleGroup } from '@/db/types';

/** Slugs accepted by `react-native-body-highlighter`. */
export type BodyHighlighterSlug = Slug;

/** Map Incline muscle groups → body-highlighter region(s). */
export const MUSCLE_TO_BODY_SLUGS: Record<MuscleGroup, BodyHighlighterSlug[]> = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back'],
  shoulders: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  core: ['abs', 'obliques'],
  forearms: ['forearm'],
  traps: ['trapezius'],
  full_body: [],
};

export interface BodyHighlightPart {
  slug: BodyHighlighterSlug;
  intensity: number;
}

/**
 * Build highlighter data from set counts (or any intensity map).
 * Intensity is scaled 1–3 for the library's discrete levels.
 */
export function bodyPartsFromMuscleCounts(
  counts: Partial<Record<MuscleGroup, number>>,
): BodyHighlightPart[] {
  const entries = Object.entries(counts).filter(([, n]) => (n ?? 0) > 0) as [MuscleGroup, number][];
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, n]) => n));
  const bySlug = new Map<BodyHighlighterSlug, number>();
  for (const [muscle, n] of entries) {
    const intensity = max <= 0 ? 1 : Math.max(1, Math.ceil((n / max) * 3));
    for (const slug of MUSCLE_TO_BODY_SLUGS[muscle]) {
      bySlug.set(slug, Math.max(bySlug.get(slug) ?? 0, intensity));
    }
  }
  return [...bySlug.entries()].map(([slug, intensity]) => ({ slug, intensity }));
}

/** Single-muscle highlight (exercise detail / picker). */
export function bodyPartsForMuscles(
  muscles: MuscleGroup[],
  intensity = 2,
): BodyHighlightPart[] {
  const bySlug = new Map<BodyHighlighterSlug, number>();
  for (const muscle of muscles) {
    for (const slug of MUSCLE_TO_BODY_SLUGS[muscle]) {
      bySlug.set(slug, intensity);
    }
  }
  return [...bySlug.entries()].map(([slug, value]) => ({ slug, intensity: value }));
}
