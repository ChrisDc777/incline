import { describe, expect, it } from 'vitest';

import { idsToTagAsWarmup, type WarmupCandidateSet } from '../warmup-backfill';

function s(
  partial: Partial<WarmupCandidateSet> & Pick<WarmupCandidateSet, 'id' | 'setIndex' | 'weight'>,
): WarmupCandidateSet {
  return {
    workoutLogId: 1,
    exerciseId: 1,
    completed: true,
    setType: 'working',
    ...partial,
  };
}

describe('idsToTagAsWarmup', () => {
  it('tags a light prefix before near-peak working sets', () => {
    const ids = idsToTagAsWarmup([
      s({ id: 1, setIndex: 0, weight: 40 }),
      s({ id: 2, setIndex: 1, weight: 60 }),
      s({ id: 3, setIndex: 2, weight: 100 }),
      s({ id: 4, setIndex: 3, weight: 100 }),
    ]);
    expect(ids).toEqual([1, 2]);
  });

  it('leaves straight working sets alone', () => {
    const ids = idsToTagAsWarmup([
      s({ id: 1, setIndex: 0, weight: 80 }),
      s({ id: 2, setIndex: 1, weight: 80 }),
      s({ id: 3, setIndex: 2, weight: 80 }),
    ]);
    expect(ids).toEqual([]);
  });

  it('does not tag back-off sets after peak', () => {
    const ids = idsToTagAsWarmup([
      s({ id: 1, setIndex: 0, weight: 100 }),
      s({ id: 2, setIndex: 1, weight: 100 }),
      s({ id: 3, setIndex: 2, weight: 70 }),
    ]);
    expect(ids).toEqual([]);
  });

  it('tags incomplete prefix sets before working weight', () => {
    const ids = idsToTagAsWarmup([
      s({ id: 1, setIndex: 0, weight: 40, completed: false }),
      s({ id: 2, setIndex: 1, weight: 100 }),
      s({ id: 3, setIndex: 2, weight: 100 }),
    ]);
    expect(ids).toEqual([1]);
  });

  it('skips bodyweight and already-tagged warm-ups', () => {
    expect(idsToTagAsWarmup([
      s({ id: 1, setIndex: 0, weight: 0 }),
      s({ id: 2, setIndex: 1, weight: 0 }),
    ])).toEqual([]);

    expect(idsToTagAsWarmup([
      s({ id: 1, setIndex: 0, weight: 40, setType: 'warmup' }),
      s({ id: 2, setIndex: 1, weight: 100 }),
    ])).toEqual([]);
  });

  it('does not treat a close ramp as a warm-up', () => {
    const ids = idsToTagAsWarmup([
      s({ id: 1, setIndex: 0, weight: 85 }),
      s({ id: 2, setIndex: 1, weight: 90 }),
      s({ id: 3, setIndex: 2, weight: 100 }),
    ]);
    expect(ids).toEqual([]);
  });
});
