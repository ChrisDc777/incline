import { describe, expect, it } from 'vitest';

import { isoDate, startOfWeek } from '@/db/calc';
import {
  computeBestDayStreak,
  computeBestWeeklyStreak,
  computeDayStreak,
  computeMonthFrequency,
  computeWeeklyStreak,
  computeYearFrequency,
  formatFrequencyLabel,
} from '@/lib/consistency';

/** Local noon so DST / midnight edges do not shift the calendar day. */
function atNoon(y: number, m: number, d: number): number {
  return new Date(y, m, d, 12, 0, 0).getTime();
}

describe('computeWeeklyStreak', () => {
  it('counts consecutive weeks ending this week', () => {
    const now = atNoon(2026, 7, 12); // Wed
    const thisMonday = startOfWeek(now);
    const started = [
      thisMonday + 2 * 86_400_000,
      thisMonday - 7 * 86_400_000,
      thisMonday - 14 * 86_400_000,
    ];
    expect(computeWeeklyStreak(started, now)).toBe(3);
  });

  it('keeps last week if this week is empty', () => {
    const now = atNoon(2026, 7, 12);
    const thisMonday = startOfWeek(now);
    expect(computeWeeklyStreak([thisMonday - 7 * 86_400_000], now)).toBe(1);
  });

  it('returns 0 when this and last week are empty', () => {
    const now = atNoon(2026, 7, 12);
    const thisMonday = startOfWeek(now);
    expect(computeWeeklyStreak([thisMonday - 21 * 86_400_000], now)).toBe(0);
  });
});

describe('computeBestWeeklyStreak', () => {
  it('finds the longest consecutive week run', () => {
    const w1 = startOfWeek(atNoon(2026, 6, 6));
    const started = [
      w1,
      w1 + 7 * 86_400_000,
      w1 + 14 * 86_400_000,
      w1 + 35 * 86_400_000,
      w1 + 42 * 86_400_000,
    ];
    expect(computeBestWeeklyStreak(started)).toBe(3);
  });
});

describe('computeDayStreak', () => {
  it('counts consecutive days ending today', () => {
    const now = atNoon(2026, 7, 12);
    const keys = ['2026-08-10', '2026-08-11', '2026-08-12'];
    expect(computeDayStreak(keys, now)).toBe(3);
  });

  it('keeps yesterday if today is empty', () => {
    const now = atNoon(2026, 7, 12);
    expect(computeDayStreak(['2026-08-11'], now)).toBe(1);
  });

  it('returns 0 when today and yesterday are empty', () => {
    const now = atNoon(2026, 7, 12);
    expect(computeDayStreak(['2026-08-09'], now)).toBe(0);
  });

  it('crosses month boundaries', () => {
    const now = atNoon(2026, 8, 1);
    expect(computeDayStreak(['2026-08-31', '2026-09-01'], now)).toBe(2);
  });
});

describe('computeBestDayStreak', () => {
  it('finds the longest consecutive day run', () => {
    expect(computeBestDayStreak(['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-10'])).toBe(3);
  });

  it('returns 0 for an empty history', () => {
    expect(computeBestDayStreak([])).toBe(0);
  });
});

describe('frequency', () => {
  const metrics = {
    '2026-07-31': { sessions: 1 },
    '2026-08-01': { sessions: 1 },
    '2026-08-12': { sessions: 2 },
    '2025-12-01': { sessions: 1 },
  };

  it('splits year totals by month', () => {
    const y = computeYearFrequency(metrics, 2026);
    expect(y.trainedDays).toBe(3);
    expect(y.sessions).toBe(4);
    expect(y.trainedDaysByMonth[6]).toBe(1);
    expect(y.trainedDaysByMonth[7]).toBe(2);
    expect(y.sessionsByMonth[7]).toBe(3);
  });

  it('counts one month independently', () => {
    expect(computeMonthFrequency(metrics, 2026, 7)).toEqual({ trainedDays: 2, sessions: 3 });
    expect(computeMonthFrequency(metrics, 2026, 0)).toEqual({ trainedDays: 0, sessions: 0 });
  });

  it('formats days and extra sessions', () => {
    expect(formatFrequencyLabel({ trainedDays: 0, sessions: 0 })).toBe('0 days');
    expect(formatFrequencyLabel({ trainedDays: 1, sessions: 1 })).toBe('1 day');
    expect(formatFrequencyLabel({ trainedDays: 8, sessions: 8 })).toBe('8 days');
    expect(formatFrequencyLabel({ trainedDays: 8, sessions: 10 })).toBe('8 days · 10 sessions');
  });

  it('uses local YYYY-MM-DD keys', () => {
    expect(isoDate(atNoon(2026, 7, 12))).toBe('2026-08-12');
  });
});
