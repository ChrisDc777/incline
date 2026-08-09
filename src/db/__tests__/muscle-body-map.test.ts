import { describe, expect, it } from 'vitest';

import { bodyPartsForMuscles, bodyPartsFromMuscleCounts } from '@/lib/muscle-body-map';

describe('muscle-body-map', () => {
  it('scales intensities 1–3 and maps known muscles to slugs', () => {
    const parts = bodyPartsFromMuscleCounts({ chest: 10, biceps: 5, forearms: 1 });
    const bySlug = Object.fromEntries(parts.map((p) => [p.slug, p.intensity]));
    expect(bySlug.chest).toBe(3);
    expect(bySlug.biceps).toBe(2);
    expect(bySlug.forearm).toBe(1);
  });

  it('skips unknown / empty full_body mappings without throwing', () => {
    expect(bodyPartsFromMuscleCounts({ full_body: 4 })).toEqual([]);
    expect(bodyPartsForMuscles(['chest', 'full_body']).map((p) => p.slug)).toEqual(['chest']);
  });
});
