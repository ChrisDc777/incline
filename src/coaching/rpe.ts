/** Integer RPE 1–10, or null if missing/invalid. Never invent a rating. */
export function normalizeRpe(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.round(value);
  if (n < 1 || n > 10) return null;
  return n;
}

/**
 * Average RPE only when every set has a valid rating.
 * Missing values mean “ignore RPE” — do not guess.
 */
export function averageRpeIfComplete(sets: { rpe?: number | null }[]): number | null {
  if (sets.length === 0) return null;
  const values: number[] = [];
  for (const s of sets) {
    const r = normalizeRpe(s.rpe ?? null);
    if (r == null) return null;
    values.push(r);
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Intensity signal for overload: last working set only.
 * Earlier sets may be easier on purpose; an unrated last set is treated as unknown.
 */
export function lastSetRpe(sets: { rpe?: number | null }[]): number | null {
  if (sets.length === 0) return null;
  return normalizeRpe(sets[sets.length - 1]?.rpe ?? null);
}

/** Hold instead of adding load when last session was already very hard. */
export const HIGH_RPE_HOLD_THRESHOLD = 9;
