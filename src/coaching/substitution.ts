import type { Equipment, Exercise } from '@/db/types';

export interface SubstituteScore {
  exercise: Exercise;
  score: number;
  reasons: string[];
}

const EQUIPMENT_NEAR: Partial<Record<Equipment, Equipment[]>> = {
  barbell: ['dumbbell', 'machine', 'cable'],
  dumbbell: ['barbell', 'cable', 'kettlebell'],
  machine: ['cable', 'dumbbell', 'barbell'],
  cable: ['machine', 'dumbbell', 'band'],
  kettlebell: ['dumbbell', 'barbell'],
  bodyweight: ['band', 'dumbbell'],
  band: ['cable', 'bodyweight'],
};

function equipmentCompatible(a: Equipment, b: Equipment): 'same' | 'near' | 'none' {
  if (a === b) return 'same';
  if (EQUIPMENT_NEAR[a]?.includes(b)) return 'near';
  return 'none';
}

/**
 * Rank substitutes by muscle, movement pattern, then equipment.
 * Never includes the source exercise.
 */
export function rankSubstitutes(source: Exercise, candidates: Exercise[]): SubstituteScore[] {
  const out: SubstituteScore[] = [];
  for (const ex of candidates) {
    if (ex.id === source.id) continue;
    if (ex.category === 'cardio' || ex.category === 'mobility') continue;
    const reasons: string[] = [];
    let score = 0;

    if (ex.primaryMuscle === source.primaryMuscle) {
      score += 4;
      reasons.push('same muscle');
    } else if (ex.secondaryMuscles?.includes(source.primaryMuscle)) {
      score += 1;
      reasons.push('secondary muscle');
    } else {
      continue;
    }

    if (ex.movementPattern && source.movementPattern && ex.movementPattern === source.movementPattern) {
      score += 3;
      reasons.push('same pattern');
    }

    const equip = equipmentCompatible(source.equipment, ex.equipment);
    if (equip === 'same') {
      score += 2;
      reasons.push('same equipment');
    } else if (equip === 'near') {
      score += 1;
      reasons.push('similar equipment');
    }

    if (ex.isCompound === source.isCompound) score += 1;

    if (score < 4) continue;
    out.push({ exercise: ex, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
}
