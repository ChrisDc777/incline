import { describe, expect, it } from 'vitest';

import { decreaseLoad } from '../plates';
import { detectSetFatigue } from '../fatigue';
import { detectDeload, scaleDeloadSets } from '../deload';
import { rankSubstitutes } from '../substitution';
import { collectCoachingInsights, pickHomeCoachingInsight } from '../insights';
import type { Exercise, ProgressStats } from '@/db/types';

function ex(partial: Partial<Exercise> & Pick<Exercise, 'id' | 'name' | 'primaryMuscle'>): Exercise {
  return {
    aliases: [],
    secondaryMuscles: [],
    movementPattern: 'horizontal_push',
    equipment: 'barbell',
    category: 'strength',
    isCompound: true,
    isCustom: false,
    source: 'seed',
    externalId: null,
    difficulty: 'intermediate',
    defaultRestSeconds: 90,
    instructions: [],
    tips: null,
    imageUrl: null,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe('detectSetFatigue', () => {
  it('flags a 3+ rep drop at the same load', () => {
    const cue = detectSetFatigue(
      [
        { weight: 80, reps: 10, completed: true, setType: 'working' },
        { weight: 80, reps: 9, completed: true, setType: 'working' },
        { weight: 80, reps: 6, completed: true, setType: 'working' },
      ],
      'metric',
    );
    expect(cue?.kind).toBe('reps_drop');
    expect(cue?.suggestedWeight).toBe(77.5);
  });

  it('ignores warm-ups and incomplete sets', () => {
    const cue = detectSetFatigue(
      [
        { weight: 40, reps: 8, completed: true, setType: 'warmup' },
        { weight: 80, reps: 10, completed: true, setType: 'working' },
        { weight: 80, reps: 4, completed: false, setType: 'working' },
      ],
      'metric',
    );
    expect(cue).toBeNull();
  });

  it('flags a load drop across working sets', () => {
    const cue = detectSetFatigue(
      [
        { weight: 100, reps: 5, completed: true },
        { weight: 90, reps: 5, completed: true },
      ],
      'metric',
    );
    expect(cue?.kind).toBe('load_drop');
  });
});

describe('detectDeload', () => {
  const weeks = [
    { weekStart: '2026-07-13', volume: 1000, sessions: 3 },
    { weekStart: '2026-07-20', volume: 1100, sessions: 3 },
    { weekStart: '2026-07-27', volume: 1200, sessions: 4 },
    { weekStart: '2026-08-03', volume: 1150, sessions: 3 },
  ];

  it('suggests after a 4-week streak', () => {
    const s = detectDeload({ weeklyStreak: 4, weeklyVolumes: weeks, now: Date.parse('2026-08-12') });
    expect(s?.weeksTrained).toBe(4);
    expect(scaleDeloadSets(4)).toBe(3);
    expect(scaleDeloadSets(1)).toBe(1);
  });

  it('skips when last week already looks like a cut', () => {
    const cut = [...weeks.slice(0, 3), { weekStart: '2026-08-03', volume: 400, sessions: 2 }];
    expect(detectDeload({ weeklyStreak: 4, weeklyVolumes: cut })).toBeNull();
  });

  it('respects snooze and cooldown', () => {
    const now = Date.parse('2026-08-12');
    expect(detectDeload({ weeklyStreak: 4, weeklyVolumes: weeks, snoozeUntil: now + 1000, now })).toBeNull();
    expect(detectDeload({ weeklyStreak: 4, weeklyVolumes: weeks, lastAppliedAt: now - 3 * 86_400_000, now })).toBeNull();
  });
});

describe('rankSubstitutes', () => {
  const bench = ex({ id: 1, name: 'Bench', primaryMuscle: 'chest', movementPattern: 'horizontal_push', equipment: 'barbell' });
  const dbPress = ex({ id: 2, name: 'DB press', primaryMuscle: 'chest', movementPattern: 'horizontal_push', equipment: 'dumbbell' });
  const fly = ex({ id: 3, name: 'Fly', primaryMuscle: 'chest', movementPattern: 'isolation', equipment: 'dumbbell', isCompound: false });
  const squat = ex({ id: 4, name: 'Squat', primaryMuscle: 'quads', movementPattern: 'squat_hinge', equipment: 'barbell' });

  it('ranks same muscle + pattern above isolation, excludes unrelated', () => {
    const ranked = rankSubstitutes(bench, [dbPress, fly, squat, bench]);
    expect(ranked.map((r) => r.exercise.id)).toEqual([2, 3]);
    expect(ranked[0].reasons).toContain('same pattern');
  });
});

describe('collectCoachingInsights', () => {
  const stats: ProgressStats = {
    totalSessions: 12,
    totalVolume: 8000,
    totalSets: 120,
    streak: 4,
    weeklyVolume: [
      { weekStart: '2026-07-13', volume: 1000, sessions: 3 },
      { weekStart: '2026-07-20', volume: 1100, sessions: 3 },
      { weekStart: '2026-07-27', volume: 1200, sessions: 4 },
      { weekStart: '2026-08-03', volume: 1150, sessions: 3 },
    ],
    muscleDistribution: [
      { muscle: 'chest', sets: 20, volume: 2000 },
      { muscle: 'back', sets: 8, volume: 800 },
    ],
    prs: [],
    prEventCount: 0,
    lastSessionAt: Date.now(),
  };

  it('surfaces deload before balance when streak is long', () => {
    const list = collectCoachingInsights({ stats, unit: 'metric', weeklyStreak: 4 });
    expect(list[0]?.kind).toBe('deload');
    expect(list.some((i) => i.kind === 'muscle_balance')).toBe(true);
  });

  it('pickHomeCoachingInsight still returns a single card', () => {
    const one = pickHomeCoachingInsight(stats, 'metric', { hamstrings: 10 });
    expect(one?.kind).toBe('deload');
  });
});

describe('decreaseLoad', () => {
  it('steps down by the smallest increment', () => {
    expect(decreaseLoad(80, 'metric')).toBe(77.5);
    expect(decreaseLoad(2.5, 'metric')).toBe(0);
  });
});
