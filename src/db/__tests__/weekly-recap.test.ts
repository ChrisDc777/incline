import { describe, expect, it } from 'vitest';

import { formatWeekRangeLabel, startOfWeek, weekBounds } from '@/db/calc';

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
