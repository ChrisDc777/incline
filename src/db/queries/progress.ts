import { openDatabase } from '../client';
import { estimated1RM, isoDate, startOfWeek } from '../calc';
import type {
  MonthlyVolume,
  MuscleDistribution,
  MuscleGroup,
  PeriodStats,
  PR,
  ProgressRange,
  ProgressStats,
  Trend,
  WeeklyVolume,
  WorkoutLog,
} from '../types';
import {
  mapLog,
  type LogRow,
} from './helpers';

/** Consecutive weeks (ending this week) that contain at least one session. */
export async function getStreak(): Promise<number> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ started_at: number }>('SELECT started_at FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL ORDER BY started_at DESC');
  if (rows.length === 0) return 0;
  const weeks = new Set(rows.map((r) => isoDate(startOfWeek(r.started_at))));
  const thisWeek = isoDate(startOfWeek(Date.now()));
  const lastWeek = isoDate(startOfWeek(Date.now()) - 7 * 86_400_000);
  if (!weeks.has(thisWeek) && !weeks.has(lastWeek)) return 0;
  let cursor = weeks.has(thisWeek) ? Date.now() : Date.now() - 7 * 86_400_000;
  let streak = 0;
  while (weeks.has(isoDate(startOfWeek(cursor)))) {
    streak++;
    cursor -= 7 * 86_400_000;
  }
  return streak;
}

export async function getProgressStats(weeks = 8): Promise<ProgressStats> {
  const db = await openDatabase();
  const now = Date.now();
  const weekStart = startOfWeek(now);
  const since = weekStart - (weeks - 1) * 7 * 86_400_000;

  const totals = await db.getFirstAsync<{ c: number; v: number; last: number | null }>(
    'SELECT COUNT(*) as c, COALESCE(SUM(total_volume), 0) as v, MAX(started_at) as last FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL',
  );
  const setCount = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL AND s.completed = 1',
  );

  const logs = await db.getAllAsync<{ started_at: number; total_volume: number }>(
    'SELECT started_at, total_volume FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL AND started_at >= ? ORDER BY started_at',
    since,
  );
  const buckets: WeeklyVolume[] = [];
  for (let i = 0; i < weeks; i++) {
    const ws = weekStart - (weeks - 1 - i) * 7 * 86_400_000;
    buckets.push({ weekStart: isoDate(ws), volume: 0, sessions: 0 });
  }
  for (const l of logs) {
    const ws = isoDate(startOfWeek(l.started_at));
    const b = buckets.find((x) => x.weekStart === ws);
    if (b) { b.volume += l.total_volume; b.sessions += 1; }
  }

  const muscleRows = await db.getAllAsync<{ primary_muscle: string; sets: number; volume: number }>(
    `SELECT e.primary_muscle, COUNT(s.id) as sets, COALESCE(SUM(s.weight * s.reps), 0) as volume
     FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id JOIN exercises e ON e.id = s.exercise_id
     WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL AND s.completed = 1 AND w.started_at >= ?
     GROUP BY e.primary_muscle ORDER BY sets DESC`,
    since,
  );
  const muscleDistribution: MuscleDistribution[] = muscleRows.map((r) => ({ muscle: r.primary_muscle as MuscleGroup, sets: r.sets, volume: r.volume }));

  const prRows = await db.getAllAsync<{ id: number; name: string; weight: number; reps: number; created_at: number; best_volume: number }>(
    `SELECT e.id, e.name, s.weight, s.reps, s.created_at, (s.weight * s.reps) as best_volume
     FROM set_entries s JOIN exercises e ON e.id = s.exercise_id JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL AND s.completed = 1 AND s.weight > 0`,
  );
  const bestMap = new Map<number, PR>();
  for (const r of prRows) {
    const oneRM = estimated1RM(r.weight, r.reps);
    const cur = bestMap.get(r.id);
    if (!cur || oneRM > cur.estimated1RM) {
      bestMap.set(r.id, {
        exerciseId: r.id,
        exerciseName: r.name,
        maxWeight: r.weight,
        maxReps: r.reps,
        estimated1RM: oneRM,
        bestSetVolume: r.best_volume,
        achievedAt: r.created_at,
      });
    } else if (oneRM === cur.estimated1RM && r.weight > cur.maxWeight) {
      bestMap.set(r.id, {
        ...cur,
        maxWeight: r.weight,
        maxReps: r.reps,
        bestSetVolume: Math.max(cur.bestSetVolume, r.best_volume),
        achievedAt: r.created_at,
      });
    }
  }
  const prs = [...bestMap.values()].sort((a, b) => b.estimated1RM - a.estimated1RM);

  return {
    totalSessions: totals?.c ?? 0,
    totalVolume: totals?.v ?? 0,
    totalSets: setCount?.c ?? 0,
    streak: await getStreak(),
    weeklyVolume: buckets,
    muscleDistribution,
    prs,
    lastSessionAt: totals?.last ?? null,
  };
}

const RANGE_WEEKS: Record<ProgressRange, number> = { '1m': 5, '3m': 13, '6m': 26, all: 52 };

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Time-windowed progress stats (1 month / 3 months / 6 months / all time) used
 * by the Progress insights. Returns weekly and monthly volume series plus
 * muscle distribution, PRs and a "vs previous period" trend.
 */
export async function getPeriodStats(range: ProgressRange): Promise<PeriodStats> {
  const db = await openDatabase();
  const now = Date.now();
  const weeks = RANGE_WEEKS[range];
  const since = range === 'all' ? 0 : now - weeks * 7 * 86_400_000;
  const weekStart = startOfWeek(now);

  // Bucket setup
  const weekly: WeeklyVolume[] = [];
  const weeklyMap = new Map<string, WeeklyVolume>();
  for (let i = 0; i < weeks; i++) {
    const ws = weekStart - (weeks - 1 - i) * 7 * 86_400_000;
    const key = isoDate(ws);
    const bucket = { weekStart: key, volume: 0, sessions: 0 };
    weekly.push(bucket);
    weeklyMap.set(key, bucket);
  }

  const logs = await db.getAllAsync<{ started_at: number; total_volume: number }>(
    'SELECT started_at, total_volume FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL AND started_at >= ? ORDER BY started_at',
    since,
  );

  const monthlyMap = new Map<string, MonthlyVolume>();
  let totalVolume = 0;
  let sessions = 0;
  for (const l of logs) {
    totalVolume += l.total_volume;
    sessions += 1;
    const wk = isoDate(startOfWeek(l.started_at));
    const wb = weeklyMap.get(wk);
    if (wb) { wb.volume += l.total_volume; wb.sessions += 1; }
    const mk = monthKey(l.started_at);
    const mb = monthlyMap.get(mk);
    if (mb) { mb.volume += l.total_volume; mb.sessions += 1; }
    else { monthlyMap.set(mk, { month: mk, volume: l.total_volume, sessions: 1 }); }
  }
  const monthly = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  const setCount = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL AND s.completed = 1 AND w.started_at >= ?',
    since,
  );

  const muscleRows = await db.getAllAsync<{ primary_muscle: string; sets: number; volume: number }>(
    `SELECT e.primary_muscle, COUNT(s.id) as sets, COALESCE(SUM(s.weight * s.reps), 0) as volume
     FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id JOIN exercises e ON e.id = s.exercise_id
     WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL AND s.completed = 1 AND w.started_at >= ?
     GROUP BY e.primary_muscle ORDER BY sets DESC`,
    since,
  );
  const muscleDistribution: MuscleDistribution[] = muscleRows.map((r) => ({ muscle: r.primary_muscle as MuscleGroup, sets: r.sets, volume: r.volume }));

  let previousMuscleDistribution: MuscleDistribution[] = [];
  if (range !== 'all') {
    const windowMs = weeks * 7 * 86_400_000;
    const prevSince = since - windowMs;
    const prevRows = await db.getAllAsync<{ primary_muscle: string; sets: number; volume: number }>(
      `SELECT e.primary_muscle, COUNT(s.id) as sets, COALESCE(SUM(s.weight * s.reps), 0) as volume
       FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id JOIN exercises e ON e.id = s.exercise_id
       WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL AND s.completed = 1
         AND w.started_at >= ? AND w.started_at < ?
       GROUP BY e.primary_muscle ORDER BY sets DESC`,
      prevSince,
      since,
    );
    previousMuscleDistribution = prevRows.map((r) => ({
      muscle: r.primary_muscle as MuscleGroup,
      sets: r.sets,
      volume: r.volume,
    }));
  }

  // PRs achieved within the window (best estimate-1RM per exercise)
  const prRows = await db.getAllAsync<{ exerciseId: number; name: string; weight: number; reps: number; created_at: number }>(
    `SELECT e.id as exerciseId, e.name, s.weight, s.reps, s.created_at
     FROM set_entries s JOIN exercises e ON e.id = s.exercise_id JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL AND s.completed = 1 AND s.weight > 0 AND s.created_at >= ?`,
    since,
  );
  const bestMap = new Map<number, { exerciseId: number; name: string; oneRM: number; at: number }>();
  for (const r of prRows) {
    const oneRM = estimated1RM(r.weight, r.reps);
    const cur = bestMap.get(r.exerciseId);
    if (!cur || oneRM > cur.oneRM) {
      bestMap.set(r.exerciseId, { exerciseId: r.exerciseId, name: r.name, oneRM, at: r.created_at });
    }
  }
  const prs: PR[] = [...bestMap.values()]
    .map((b) => ({ exerciseId: b.exerciseId, exerciseName: b.name, maxWeight: 0, maxReps: 0, estimated1RM: b.oneRM, bestSetVolume: 0, achievedAt: b.at }))
    .sort((a, b) => b.estimated1RM - a.estimated1RM);

  // Trend: compare the most recent bucket period to the equal-length window before it
  const bucketLen = range === '1m' || range === '3m' ? 7 * 86_400_000 : 30 * 86_400_000;
  const trend = computeTrend(logs, now, bucketLen);

  return {
    range,
    sessions,
    totalVolume,
    totalSets: setCount?.c ?? 0,
    streak: await getStreak(),
    weeklyVolume: weekly,
    monthlyVolume: monthly,
    muscleDistribution,
    previousMuscleDistribution,
    prs,
    trend,
  };
}

function computeTrend(logs: { started_at: number; total_volume: number }[], now: number, bucketLen: number): Trend | null {
  const currentStart = now - bucketLen;
  const prevStart = now - 2 * bucketLen;
  let curVol = 0, prevVol = 0, curSes = 0, prevSes = 0;
  for (const l of logs) {
    if (l.started_at >= currentStart) { curVol += l.total_volume; curSes += 1; }
    else if (l.started_at >= prevStart) { prevVol += l.total_volume; prevSes += 1; }
  }
  if (prevVol <= 0 && prevSes <= 0) return null;
  return {
    volumeDelta: prevVol > 0 ? Math.round(((curVol - prevVol) / prevVol) * 100) : (curVol > 0 ? 100 : 0),
    sessionsDelta: prevSes > 0 ? Math.round(((curSes - prevSes) / prevSes) * 100) : (curSes > 0 ? 100 : 0),
  };
}

/** Returns timestamps of local-midnight for each distinct day with completed workouts. */
export async function getWorkoutDays(): Promise<number[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ started_at: number }>(
    'SELECT started_at FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL ORDER BY started_at',
  );
  const seen = new Set<string>();
  const days: number[] = [];
  for (const r of rows) {
    const d = new Date(r.started_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    days.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  }
  return days;
}

/**
 * Sum completed session volume per local calendar day.
 * Keys are `YYYY-MM-DD` (local). Multiple sessions on one day are summed.
 */
export async function getDailyVolumeByDate(): Promise<Record<string, number>> {
  const metrics = await getDailyCalendarMetrics();
  const map: Record<string, number> = {};
  for (const [key, m] of Object.entries(metrics)) map[key] = m.volume;
  return map;
}

export interface DailyCalendarMetrics {
  /** Sum of session total_volume for the day. */
  volume: number;
  /** Max estimated 1RM across completed sets that day. */
  intensity: number;
  /** Sum of completed reps that day. */
  reps: number;
  /** Distinct completed sessions that day (presence). */
  sessions: number;
}

/**
 * Per-day training load metrics for calendar heatmaps.
 * Keys are local `YYYY-MM-DD`.
 */
export async function getDailyCalendarMetrics(): Promise<Record<string, DailyCalendarMetrics>> {
  const db = await openDatabase();
  const logs = await db.getAllAsync<{ id: number; started_at: number; total_volume: number }>(
    'SELECT id, started_at, total_volume FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL ORDER BY started_at',
  );
  const map: Record<string, DailyCalendarMetrics & { _logIds: Set<number> }> = {};

  for (const log of logs) {
    const d = new Date(log.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let bucket = map[key];
    if (!bucket) {
      bucket = { volume: 0, intensity: 0, reps: 0, sessions: 0, _logIds: new Set() };
      map[key] = bucket;
    }
    if (!bucket._logIds.has(log.id)) {
      bucket._logIds.add(log.id);
      bucket.sessions += 1;
      bucket.volume += log.total_volume ?? 0;
    }
  }

  const sets = await db.getAllAsync<{ started_at: number; weight: number; reps: number }>(
    `SELECT w.started_at as started_at, s.weight as weight, s.reps as reps
     FROM set_entries s
     JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL
       AND s.deleted_at IS NULL AND s.completed = 1`,
  );
  for (const s of sets) {
    const d = new Date(s.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let bucket = map[key];
    if (!bucket) {
      bucket = { volume: 0, intensity: 0, reps: 0, sessions: 0, _logIds: new Set() };
      map[key] = bucket;
    }
    bucket.reps += s.reps ?? 0;
    const e1rm = estimated1RM(s.weight ?? 0, s.reps ?? 0);
    if (e1rm > bucket.intensity) bucket.intensity = e1rm;
  }

  const out: Record<string, DailyCalendarMetrics> = {};
  for (const [key, b] of Object.entries(map)) {
    out[key] = {
      volume: b.volume,
      intensity: b.intensity,
      reps: b.reps,
      sessions: b.sessions,
    };
  }
  return out;
}

/** Returns completed workout logs within a date range (start/end in ms). */
export async function getWorkoutsByDateRange(startMs: number, endMs: number): Promise<WorkoutLog[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<LogRow>(
    `SELECT * FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL AND started_at >= ? AND started_at < ? ORDER BY started_at`,
    startMs, endMs,
  );
  return rows.map(mapLog);
}

/** Returns completed workout logs for a specific day (given epoch ms for the day start). */
export async function getWorkoutsForDay(dayMs: number): Promise<WorkoutLog[]> {
  const db = await openDatabase();
  const nextDay = dayMs + 86400000;
  const rows = await db.getAllAsync<LogRow>(
    `SELECT * FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL AND started_at >= ? AND started_at < ? ORDER BY started_at`,
    dayMs, nextDay,
  );
  return rows.map(mapLog);
}

/** Returns the number of completed workout days in a date range. */
export async function getWorkoutCountInRange(startMs: number, endMs: number): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(DISTINCT (started_at / 86400000) * 86400000) as c FROM workout_logs WHERE ended_at IS NOT NULL AND deleted_at IS NULL AND started_at >= ? AND started_at < ?`,
    startMs, endMs,
  );
  return row?.c ?? 0;
}
