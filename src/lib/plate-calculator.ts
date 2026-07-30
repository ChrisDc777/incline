/**
 * Plate calculator — given a target weight and barbell weight,
 * returns the plates to load on each side.
 */

export interface Plate {
  weight: number;
  count: number;
}

const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const LB_PLATES = [45, 35, 25, 10, 5, 2.5, 1.25];
const BARBELL_KG = 20;
const BARBELL_LB = 45;

/**
 * Calculate plates needed per side.
 * Returns null if the target weight is less than the barbell.
 */
export function calculatePlates(
  targetWeight: number,
  unit: 'kg' | 'lb' = 'kg',
): { plates: Plate[]; totalPerSide: number; barbell: number } | null {
  const barbell = unit === 'kg' ? BARBELL_KG : BARBELL_LB;
  const availablePlates = unit === 'kg' ? KG_PLATES : LB_PLATES;

  const barWeight = targetWeight - barbell;
  if (barWeight < 0) return null;

  const perSide = barWeight / 2;
  let remaining = perSide;
  const plates: Plate[] = [];

  for (const plateWeight of availablePlates) {
    let count = 0;
    while (remaining >= plateWeight - 0.001) {
      count++;
      remaining -= plateWeight;
    }
    if (count > 0) {
      plates.push({ weight: plateWeight, count });
    }
  }

  return {
    plates,
    totalPerSide: perSide,
    barbell,
  };
}
