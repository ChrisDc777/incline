import { describe, expect, it } from 'vitest';

import { shouldStartRestAfterComplete } from '@/lib/superset-rest';

describe('shouldStartRestAfterComplete', () => {
  it('starts rest for solo sets', () => {
    const sets = [
      { id: 1, exerciseId: 10, setIndex: 0, completed: true, supersetGroup: null },
    ];
    expect(shouldStartRestAfterComplete(sets, 1)).toEqual({ start: true, kind: 'set' });
  });

  it('waits until the full superset round is complete', () => {
    const sets = [
      { id: 1, exerciseId: 10, setIndex: 0, completed: true, supersetGroup: 1 },
      { id: 2, exerciseId: 11, setIndex: 0, completed: false, supersetGroup: 1 },
    ];
    expect(shouldStartRestAfterComplete(sets, 1)).toEqual({ start: false, kind: 'superset' });

    const after = sets.map((s) => (s.id === 2 ? { ...s, completed: true } : s));
    expect(shouldStartRestAfterComplete(after, 2)).toEqual({ start: true, kind: 'superset' });
  });
});
