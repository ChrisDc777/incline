import { describe, expect, it } from 'vitest';

import { celebrationKind, finishCelebrationMessage } from '@/lib/finish-message';

describe('finishCelebrationMessage', () => {
  it('prioritizes PRs over consistency copy', () => {
    expect(finishCelebrationMessage({ prCount: 1, weekSessions: 5 })).toBe(
      "New PR! You're getting stronger.",
    );
    expect(finishCelebrationMessage({ prCount: 2, weekSessions: 5 })).toBe(
      'New PRs! 2 records this session.',
    );
  });

  it('uses consistency copy when there are no PRs', () => {
    expect(finishCelebrationMessage({ prCount: 0, weekSessions: 5 })).toBe(
      'Consistency pays off — 5 workouts this week!',
    );
    expect(finishCelebrationMessage({ prCount: 0, weekSessions: 3 })).toBe(
      'Solid week — keep the streak going.',
    );
    expect(finishCelebrationMessage({ prCount: 0, weekSessions: 1 })).toBe(
      'Great session! You crushed it today.',
    );
  });
});

describe('celebrationKind', () => {
  it('treats PRs and 3+ weekly sessions as meaningful', () => {
    expect(celebrationKind({ prCount: 1, weekSessions: 1 })).toBe('meaningful');
    expect(celebrationKind({ prCount: 0, weekSessions: 3 })).toBe('meaningful');
    expect(celebrationKind({ prCount: 0, weekSessions: 1 })).toBe('normal');
  });
});
