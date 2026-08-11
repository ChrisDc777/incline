import { describe, expect, it } from 'vitest';

import {
  formatWeekRangeLabel,
  monthBounds,
  monthKey,
  previousMonthStart,
  startOfWeek,
  weekBounds,
} from '@/db/calc';

describe('weekBounds', () => {
  it('aligns to Monday–Sunday for a midweek timestamp', () => {
    const wed = new Date(2026, 7, 12, 15, 0, 0).getTime();
    const { startMs, endMs } = weekBounds(wed);
    expect(startMs).toBe(startOfWeek(wed));
    expect(endMs - startMs).toBe(7 * 86_400_000);
    expect(new Date(startMs).getDay()).toBe(1);
  });
});

describe('formatWeekRangeLabel', () => {
  it('formats a readable range', () => {
    const monday = new Date(2026, 7, 10, 0, 0, 0).getTime();
    const label = formatWeekRangeLabel(monday);
    expect(label).toMatch(/Aug/);
    expect(label).toContain('–');
  });
});

describe('monthBounds', () => {
  it('spans the calendar month', () => {
    const mid = new Date(2026, 7, 15).getTime();
    const { startMs, endMs } = monthBounds(mid);
    expect(monthKey(startMs)).toBe('2026-08');
    expect(new Date(startMs).getDate()).toBe(1);
    expect(new Date(endMs).getMonth()).toBe(8);
  });

  it('previousMonthStart goes back one month', () => {
    const sept = new Date(2026, 8, 5).getTime();
    expect(monthKey(previousMonthStart(sept))).toBe('2026-08');
  });
});
