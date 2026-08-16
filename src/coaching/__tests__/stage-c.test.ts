import { describe, expect, it } from 'vitest';

import { applyReadinessToSuggestion } from '../readiness';
import { suggestNextLoad } from '../overload';
import { pickHomeCoachingInsight } from '../insights';
import { detectProgramPlanDiff, programPlanInsight } from '../program-plan';
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

describe('programPlanInsight', () => {
  it('builds a coaching insight with kind in href', () => {
    const diff = detectProgramPlanDiff({
      programId: 1,
      programName: 'PPL',
      isCustom: true,
      weeks: 4,
      startedAt: Date.parse('2026-08-10T12:00:00'),
      slots: [{ week: 1, day: 2, templateId: 10, templateName: 'Push' }],
      trainedDayStarts: [],
      now: Date.parse('2026-08-12T12:00:00'),
    });
    expect(diff).not.toBeNull();
    const insight = programPlanInsight(diff!);
    expect(insight.kind).toBe('program_plan');
    expect(insight.id).toBe(`program-plan-${diff!.kind}`);
    expect(insight.href).toBe(`/(app)/program-adjust?kind=${diff!.kind}`);
  });
});

describe('pickHomeCoachingInsight program plan priority', () => {
  const stats = {
    totalSessions: 10,
    totalVolume: 5000,
    totalSets: 100,
    streak: 4,
    weeklyVolume: [
      { weekStart: '2026-07-28', volume: 1000, sessions: 3 },
      { weekStart: '2026-08-04', volume: 1200, sessions: 3 },
    ],
    muscleDistribution: [],
    prs: [],
    prEventCount: 0,
    lastSessionAt: Date.now(),
  };

  it('prefers program plan insight over generic deload', () => {
    const plan = programPlanInsight({
      kind: 'catch_up',
      title: 'Catch up',
      body: 'Missed day',
      programId: 1,
      programName: 'PPL',
      targetWeek: 1,
      targetDay: 3,
      templateId: 10,
      templateName: 'Push',
    });
    const picked = pickHomeCoachingInsight(stats, 'metric', null, {
      weeklyStreak: 4,
      programPlanInsight: plan,
    });
    expect(picked?.kind).toBe('program_plan');
    expect(picked?.id).toBe('program-plan-catch_up');
  });
});
