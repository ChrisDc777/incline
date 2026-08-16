import { kvStorage } from '@/db/kv';
import { startOfDay } from '@/db/calc';
import type { ReadinessLevel } from './types';

export const READINESS_KEY = 'coaching.readiness.today';

interface StoredReadiness {
  /** Local calendar day start ms. */
  day: number;
  level: ReadinessLevel;
}

function dayKey(now = Date.now()): number {
  return startOfDay(now);
}

export async function getTodayReadiness(now = Date.now()): Promise<ReadinessLevel | null> {
  const raw = await kvStorage.getItem(READINESS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredReadiness;
    if (!parsed?.level || parsed.day !== dayKey(now)) return null;
    if (parsed.level !== 'fresh' && parsed.level !== 'ok' && parsed.level !== 'tired') return null;
    return parsed.level;
  } catch {
    return null;
  }
}

export async function setTodayReadiness(level: ReadinessLevel, now = Date.now()): Promise<void> {
  const payload: StoredReadiness = { day: dayKey(now), level };
  await kvStorage.setItem(READINESS_KEY, JSON.stringify(payload));
}

export async function clearTodayReadiness(): Promise<void> {
  await kvStorage.removeItem(READINESS_KEY);
}
