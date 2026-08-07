import { describe, expect, it } from 'vitest';

import { weekdayMon1 } from '../calc';

describe('program schedule helpers', () => {
  it('maps JS Sunday to 7 and Monday to 1', () => {
    // 2024-01-01 was a Monday
    expect(weekdayMon1(new Date(2024, 0, 1).getTime())).toBe(1);
    // 2024-01-07 was a Sunday
    expect(weekdayMon1(new Date(2024, 0, 7).getTime())).toBe(7);
    // 2024-01-03 was a Wednesday
    expect(weekdayMon1(new Date(2024, 0, 3).getTime())).toBe(3);
  });

  it('cycles week index from elapsed days', () => {
    const weeks = 4;
    const weekOf = (elapsedDays: number) => (Math.floor(elapsedDays / 7) % weeks) + 1;
    expect(weekOf(0)).toBe(1);
    expect(weekOf(7)).toBe(2);
    expect(weekOf(21)).toBe(4);
    expect(weekOf(28)).toBe(1);
  });
});
