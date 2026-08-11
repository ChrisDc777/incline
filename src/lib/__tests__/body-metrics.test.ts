import { describe, expect, it } from 'vitest';

import { bodyMetricUnit, sanitizeEnabledBodyMetrics } from '@/lib/body-metrics';

describe('sanitizeEnabledBodyMetrics', () => {
  it('keeps bodyweight and drops unknowns', () => {
    expect(sanitizeEnabledBodyMetrics(['waist', 'nope', 'arms'])).toEqual([
      'bodyweight',
      'waist',
      'arms',
    ]);
  });

  it('falls back to defaults', () => {
    expect(sanitizeEnabledBodyMetrics(null)).toContain('bodyweight');
  });
});

describe('bodyMetricUnit', () => {
  it('maps weight and length units from settings', () => {
    expect(bodyMetricUnit('bodyweight', 'metric')).toBe('kg');
    expect(bodyMetricUnit('bodyweight', 'imperial')).toBe('lb');
    expect(bodyMetricUnit('waist', 'metric')).toBe('cm');
    expect(bodyMetricUnit('waist', 'imperial')).toBe('in');
  });
});
