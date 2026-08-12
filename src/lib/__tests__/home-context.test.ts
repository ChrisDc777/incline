import { describe, expect, it } from 'vitest';

import { suggestNextLoad } from '../../coaching/overload';
import { buildHomeContextCards } from '../../lib/home-context';
import type { ProgressStats } from '../types';

describe('suggestNextLoad', () => {
  it('suggests load increase when all sets hit rep max', () => {
    const s = suggestNextLoad({
      exerciseId: 1,
      exerciseName: 'Bench',
      lastWorkingSets: [
        { weight: 80, reps: 12 },
        { weight: 80, reps: 12 },
        { weight: 80, reps: 12 },
      ],
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetSets: 3,
      unit: 'metric',
    });
    expect(s?.weight).toBe(82.5);
    expect(s?.reps).toBe(8);
    expect(s?.reasonCode).toBe('hit_rep_range_increase_load');
  });

  it('suggests rep increase before load when below max', () => {
    const s = suggestNextLoad({
      exerciseId: 1,
      exerciseName: 'Squat',
      lastWorkingSets: [
        { weight: 100, reps: 8 },
        { weight: 100, reps: 8 },
      ],
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetSets: 3,
      unit: 'metric',
    });
    expect(s?.weight).toBe(100);
    expect(s?.reps).toBe(9);
    expect(s?.reasonCode).toBe('hold_weight_add_reps');
  });
});

describe('buildHomeContextCards', () => {
  const baseStats: ProgressStats = {
    totalSessions: 10,
    totalVolume: 5000,
    totalSets: 100,
    streak: 2,
    weeklyVolume: [
      { weekStart: '2026-07-28', volume: 1000, sessions: 3 },
      { weekStart: '2026-08-04', volume: 1200, sessions: 2 },
    ],
    muscleDistribution: [],
    prs: [],
    lastSessionAt: Date.now() - 5 * 86_400_000,
  };

  it('caps cards and prioritizes inactivity over announcements', () => {
    const cards = buildHomeContextCards({
      stats: baseStats,
      unit: 'metric',
      weeklyGoal: 4,
      sessionsThisWeek: 2,
      goalMet: false,
      sessionsToGoal: 2,
      dismissedAnnouncementIds: [],
      announcements: [{ id: 'x', kind: 'promo', title: 'Promo', subtitle: 'Sub' }],
    });
    expect(cards.length).toBeLessThanOrEqual(2);
    expect(cards.some((c) => c.kind === 'inactivity' || c.kind === 'weekly_goal')).toBe(true);
  });
});
