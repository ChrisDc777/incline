import { COACHING_RULE_VERSION, type OverloadInput, type ReasonCode, type TrainingSuggestion } from './types';
import { increaseLoad } from './plates';

function reasonText(code: ReasonCode, ctx: { repsMax: number; repsMin: number; nextWeight?: number; unitLabel: string }): string {
  switch (code) {
    case 'no_history':
      return 'No recent working sets — start at your template targets.';
    case 'hold_weight_add_reps':
      return `Hit your reps last time — try adding 1 rep before increasing load.`;
    case 'hit_rep_range_increase_load':
      return `You hit ${ctx.repsMax} reps on all sets — try +${ctx.unitLabel === 'kg' ? '2.5 kg' : '5 lb'}.`;
    case 'partial_miss_hold':
      return `Some sets missed ${ctx.repsMin} reps — hold weight and aim for the bottom of your range.`;
    case 'all_sets_maxed':
      return `All sets at top of range — time to add weight.`;
    default:
      return 'Suggested from your last session.';
  }
}

/**
 * Double-progression overload: reps within template range first, then smallest plate step.
 * Uses only completed working sets from the caller.
 */
export function suggestNextLoad(input: OverloadInput): TrainingSuggestion | null {
  const sets = input.lastWorkingSets.filter((s) => s.weight > 0 && s.reps > 0);
  if (sets.length === 0) {
    return {
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
      weight: 0,
      reps: input.targetRepsMin,
      targetSets: input.targetSets,
      reasonCode: 'no_history',
      reasonText: reasonText('no_history', { repsMin: input.targetRepsMin, repsMax: input.targetRepsMax, unitLabel: input.unit === 'metric' ? 'kg' : 'lb' }),
      ruleVersion: COACHING_RULE_VERSION,
    };
  }

  const workingWeight = sets[0].weight;
  const allSameWeight = sets.every((s) => Math.abs(s.weight - workingWeight) < 0.01);
  const unitLabel = input.unit === 'metric' ? 'kg' : 'lb';
  const ctx = { repsMin: input.targetRepsMin, repsMax: input.targetRepsMax, unitLabel };

  if (!allSameWeight) {
    const top = sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0]);
    return {
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
      weight: top.weight,
      reps: Math.max(input.targetRepsMin, top.reps),
      targetSets: input.targetSets,
      reasonCode: 'partial_miss_hold',
      reasonText: 'Mixed loads last session — match your heaviest working set.',
      ruleVersion: COACHING_RULE_VERSION,
    };
  }

  const allHitMax = sets.length >= 1 && sets.every((s) => s.reps >= input.targetRepsMax);
  const allHitMin = sets.every((s) => s.reps >= input.targetRepsMin);
  const anyBelowMin = sets.some((s) => s.reps < input.targetRepsMin);

  if (allHitMax) {
    const nextWeight = increaseLoad(workingWeight, input.unit);
    return {
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
      weight: nextWeight,
      reps: input.targetRepsMin,
      targetSets: input.targetSets,
      reasonCode: 'hit_rep_range_increase_load',
      reasonText: reasonText('hit_rep_range_increase_load', { ...ctx, nextWeight }),
      ruleVersion: COACHING_RULE_VERSION,
    };
  }

  if (anyBelowMin) {
    return {
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
      weight: workingWeight,
      reps: input.targetRepsMin,
      targetSets: input.targetSets,
      reasonCode: 'partial_miss_hold',
      reasonText: reasonText('partial_miss_hold', ctx),
      ruleVersion: COACHING_RULE_VERSION,
    };
  }

  if (allHitMin) {
    const minReps = Math.min(...sets.map((s) => s.reps));
    const nextReps = Math.min(input.targetRepsMax, minReps + 1);
    if (nextReps >= input.targetRepsMax) {
      const nextWeight = increaseLoad(workingWeight, input.unit);
      return {
        exerciseId: input.exerciseId,
        exerciseName: input.exerciseName,
        weight: nextWeight,
        reps: input.targetRepsMin,
        targetSets: input.targetSets,
        reasonCode: 'all_sets_maxed',
        reasonText: reasonText('all_sets_maxed', ctx),
        ruleVersion: COACHING_RULE_VERSION,
      };
    }
    return {
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
      weight: workingWeight,
      reps: nextReps,
      targetSets: input.targetSets,
      reasonCode: 'hold_weight_add_reps',
      reasonText: reasonText('hold_weight_add_reps', ctx),
      ruleVersion: COACHING_RULE_VERSION,
    };
  }

  return {
    exerciseId: input.exerciseId,
    exerciseName: input.exerciseName,
    weight: workingWeight,
    reps: input.targetRepsMin,
    targetSets: input.targetSets,
    reasonCode: 'partial_miss_hold',
    reasonText: reasonText('partial_miss_hold', ctx),
    ruleVersion: COACHING_RULE_VERSION,
  };
}
