import { describe, expect, it } from 'vitest';

import { averageRpeIfComplete, HIGH_RPE_HOLD_THRESHOLD, lastSetRpe, normalizeRpe } from '../rpe';
import { suggestNextLoad } from '../overload';
import type { LastWorkingSet, OverloadInput } from '../types';

function input(sets: LastWorkingSet[]): OverloadInput {
  return {
    exerciseId: 1,
    exerciseName: 'Bench',
    lastWorkingSets: sets,
    targetRepsMin: 8,
    targetRepsMax: 10,
    targetSets: 3,
    unit: 'metric',
  };
}

describe('normalizeRpe', () => {
  it('accepts integers 1–10', () => {
    expect(normalizeRpe(1)).toBe(1);
    expect(normalizeRpe(10)).toBe(10);
    expect(normalizeRpe(8.4)).toBe(8);
  });

  it('rejects missing or out of range', () => {
    expect(normalizeRpe(null)).toBeNull();
    expect(normalizeRpe(undefined)).toBeNull();
    expect(normalizeRpe(0)).toBeNull();
    expect(normalizeRpe(11)).toBeNull();
    expect(normalizeRpe('8')).toBeNull();
  });
});

describe('averageRpeIfComplete', () => {
  it('returns null if any set is missing RPE', () => {
    expect(averageRpeIfComplete([{ rpe: 9 }, { rpe: null }, { rpe: 8 }])).toBeNull();
    expect(averageRpeIfComplete([])).toBeNull();
  });

  it('averages when every set is rated', () => {
    expect(averageRpeIfComplete([{ rpe: 9 }, { rpe: 9 }, { rpe: 9 }])).toBe(9);
    expect(averageRpeIfComplete([{ rpe: 8 }, { rpe: 9 }, { rpe: 10 }])).toBe(9);
  });
});

describe('suggestNextLoad RPE hold', () => {
  const maxed: LastWorkingSet[] = [
    { weight: 80, reps: 10 },
    { weight: 80, reps: 10 },
    { weight: 80, reps: 10 },
  ];

  it('increases load when RPE is missing', () => {
    const s = suggestNextLoad(input(maxed));
    expect(s?.reasonCode).toBe('hit_rep_range_increase_load');
    expect(s?.weight).toBe(82.5);
  });

  it('increases load when average RPE is below the hold threshold', () => {
    const s = suggestNextLoad(
      input(maxed.map((set) => ({ ...set, rpe: HIGH_RPE_HOLD_THRESHOLD - 1 }))),
    );
    expect(s?.reasonCode).toBe('hit_rep_range_increase_load');
    expect(s?.weight).toBe(82.5);
  });

  it('holds when the last working set is rated high', () => {
    const s = suggestNextLoad(input(maxed.map((set) => ({ ...set, rpe: 9 }))));
    expect(s?.reasonCode).toBe('high_rpe_hold');
    expect(s?.weight).toBe(80);
  });

  it('holds from last-set RPE even if earlier sets are unrated', () => {
    const s = suggestNextLoad(
      input([
        { weight: 80, reps: 10 },
        { weight: 80, reps: 10 },
        { weight: 80, reps: 10, rpe: 9 },
      ]),
    );
    expect(s?.reasonCode).toBe('high_rpe_hold');
    expect(s?.weight).toBe(80);
  });

  it('ignores RPE when the last working set is unrated', () => {
    const s = suggestNextLoad(
      input([
        { weight: 80, reps: 10, rpe: 9 },
        { weight: 80, reps: 10, rpe: 10 },
        { weight: 80, reps: 10 },
      ]),
    );
    expect(s?.reasonCode).toBe('hit_rep_range_increase_load');
    expect(s?.weight).toBe(82.5);
  });
});

describe('lastSetRpe', () => {
  it('reads only the last set', () => {
    expect(lastSetRpe([{ rpe: 7 }, { rpe: 9 }])).toBe(9);
    expect(lastSetRpe([{ rpe: 10 }, { rpe: null }])).toBeNull();
    expect(lastSetRpe([])).toBeNull();
  });
});
