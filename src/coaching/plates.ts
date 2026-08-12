import type { Unit } from '@/db/types';

/** Smallest standard load increment for barbell-style progression. */
export function smallestIncrement(unit: Unit): number {
  return unit === 'metric' ? 2.5 : 5;
}

/** Snap a weight to the nearest valid plate increment (round up when increasing). */
export function roundToIncrement(weight: number, unit: Unit, direction: 'up' | 'nearest' = 'nearest'): number {
  const inc = smallestIncrement(unit);
  if (inc <= 0 || weight <= 0) return weight;
  const steps = weight / inc;
  if (direction === 'up') return Math.ceil(steps - 1e-9) * inc;
  if (direction === 'nearest') return Math.round(steps) * inc;
  return Math.floor(steps + 1e-9) * inc;
}

export function increaseLoad(weight: number, unit: Unit): number {
  const inc = smallestIncrement(unit);
  return roundToIncrement(weight + inc, unit, 'nearest');
}
