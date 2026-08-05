import { describe, expect, it } from 'vitest';

import { estimated1RM, isoDate, setVolume, startOfDay, startOfWeek } from '../calc';

describe('calc helpers', () => {
  it('estimated1RM uses Epley and handles edge cases', () => {
    expect(estimated1RM(100, 1)).toBe(100);
    expect(estimated1RM(100, 5)).toBeCloseTo(116.67, 1);
    expect(estimated1RM(0, 5)).toBe(0);
    expect(estimated1RM(100, 0)).toBe(0);
  });

  it('setVolume multiplies weight and reps', () => {
    expect(setVolume(80, 5)).toBe(400);
  });

  it('isoDate formats local YYYY-MM-DD', () => {
    const ms = new Date(2024, 0, 15, 12, 0, 0).getTime();
    expect(isoDate(ms)).toBe('2024-01-15');
  });

  it('startOfDay zeroes the clock', () => {
    const ms = new Date(2024, 5, 10, 18, 30, 0).getTime();
    const start = new Date(startOfDay(ms));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it('startOfWeek lands on Monday', () => {
    // Wednesday
    const wed = new Date(2024, 5, 12, 12, 0, 0).getTime();
    const monday = new Date(startOfWeek(wed));
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(10);
  });
});
