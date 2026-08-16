import { describe, expect, it } from 'vitest';

import { applyReadinessToSuggestion } from '../readiness';
import { suggestNextLoad } from '../overload';
import { detectProgramPlanDiff } from '../program-plan';
import type { LastWorkingSet, OverloadInput, TrainingSuggestion } from '../types';

function input(sets: LastWorkingSet[], readiness?: OverloadInput['readiness']): OverloadInput {
  return {
    exerciseId: 1,
    exerciseName: 'Bench',
    lastWorkingSets: sets,
    targetRepsMin: 8,
    targetRepsMax: 10,
    targetSets: 3,
    unit: 'metric',
    readiness,
  };
}

const maxed: LastWorkingSet[] = [
  { weight: 80, reps: 10 },
  { weight: 80, reps: 10 },
  { weight: 80, reps: 10 },
];

describe('readiness modulation', () => {
  it('leaves progression alone when fresh or unset', () => {
    const base = suggestNextLoad(input(maxed));
    expect(base?.reasonCode).toBe('hit_rep_range_increase_load');
    expect(suggestNextLoad(input(maxed, 'fresh'))?.weight).toBe(base?.weight);
    expect(suggestNextLoad(input(maxed, null))?.weight).toBe(base?.weight);
  });

  it('softens load when tired', () => {
    const s = suggestNextLoad(input(maxed, 'tired'));
    expect(s?.reasonCode).toBe('readiness_hold');
    expect(s?.weight).toBe(77.5);
  });

  it('applyReadinessToSuggestion holds increases when tired', () => {
    const sug: TrainingSuggestion = {
      exerciseId: 1,
      exerciseName: 'Bench',
      weight: 82.5,
      reps: 8,
      targetSets: 3,
      reasonCode: 'hit_rep_range_increase_load',
      reasonText: 'up',
      ruleVersion: 'test',
    };
    const next = applyReadinessToSuggestion(sug, 'tired', 'metric', 80);
    expect(next.reasonCode).toBe('readiness_hold');
    expect(next.weight).toBe(77.5);
  });
});

describe('detectProgramPlanDiff', () => {
  const monday = Date.parse('2026-08-10T12:00:00'); // Mon
  const tue = monday + 86_400_000;
  const wed = monday + 2 * 86_400_000;

  it('suggests catch-up when a programmed day was missed', () => {
    const diff = detectProgramPlanDiff({
      programId: 1,
      programName: 'PPL',
      isCustom: true,
      weeks: 4,
      startedAt: monday,
      slots: [
        { week: 1, day: 2, templateId: 10, templateName: 'Push' }, // Tue
        { week: 1, day: 4, templateId: 11, templateName: 'Pull' }, // Thu
      ],
      trainedDayStarts: [],
      now: wed, // Wed — missed Tue, Wed is open
    });
    expect(diff?.kind).toBe('catch_up');
    expect(diff?.templateId).toBe(10);
    expect(diff?.targetDay).toBe(3); // Wed
  });

  it('suggests deload insert on an open day when flagged', () => {
    const diff = detectProgramPlanDiff({
      programId: 1,
      programName: 'PPL',
      isCustom: true,
      weeks: 4,
      startedAt: monday,
      slots: [{ week: 1, day: 1, templateId: 10, templateName: 'Push' }],
      trainedDayStarts: [monday],
      suggestDeload: true,
      deloadSourceTemplateId: 10,
      deloadSourceTemplateName: 'Push',
      now: tue,
    });
    expect(diff?.kind).toBe('deload_insert');
    expect(diff?.targetDay).toBe(2);
  });

  it('ignores non-custom programs', () => {
    expect(
      detectProgramPlanDiff({
        programId: 1,
        programName: 'Seed',
        isCustom: false,
        weeks: 4,
        startedAt: monday,
        slots: [{ week: 1, day: 2, templateId: 10, templateName: 'Push' }],
        trainedDayStarts: [],
        now: wed,
      }),
    ).toBeNull();
  });
});
