import { openDatabase } from '../client';
import { estimated1RM, formatVolume, isoDate, weekBounds } from '../calc';
import type { MuscleDistribution, MuscleGroup, PR, Unit, WeeklyRecap } from '../types';
import { getStreak } from './progress';

const WEEK_MS = 7 * 86_400_000;

export { weekBounds, formatWeekRangeLabel } from '../calc';

function insightLine(input: {
  sessions: number;
  volumeLabel: string;
  volumeDeltaPct: number | null;
  prCount: number;
}): string {
  const parts = [
    `${input.sessions} session${input.sessions === 1 ? '' : 's'}`,
    input.volumeLabel,
  ];
  if (input.volumeDeltaPct !== null) {
    parts.push(`${input.volumeDeltaPct > 0 ? '+' : ''}${input.volumeDeltaPct}% vol`);
  }
  if (input.prCount > 0) {
    parts.push(`${input.prCount} PR${input.prCount === 1 ? '' : 's'}`);
  }
  if (input.sessions === 0) return 'Quiet week — a short session still counts.';
  if (input.sessions >= 4) return `Strong week · ${parts.join(' · ')}`;
  if (input.prCount > 0) return `New records · ${parts.join(' · ')}`;
  return `Your week · ${parts.join(' · ')}`;
}

/**
 * Calendar-week recap (Monday–Sunday). Pass any timestamp in the desired week;
 * defaults to the week containing `now`.
 */
export async function getWeeklyRecap(
  weekStartMs = Date.now(),
  unit: Unit = 'metric',
): Promise<WeeklyRecap> {
  const db = await openDatabase();
  const { startMs, endMs } = weekBounds(weekStartMs);
  const prevStart = startMs - WEEK_MS;
  const weekStart = isoDate(startMs);

  const logs = await db.getAllAsync<{ started_at: number; total_volume: number }>(
    `SELECT started_at, total_volume FROM workout_logs
     WHERE ended_at IS NOT NULL AND deleted_at IS NULL
       AND started_at >= ? AND started_at < ?
     ORDER BY started_at`,
    startMs,
    endMs,
  );
  const prevLogs = await db.getAllAsync<{ started_at: number; total_volume: number }>(
    `SELECT started_at, total_volume FROM workout_logs
     WHERE ended_at IS NOT NULL AND deleted_at IS NULL
       AND started_at >= ? AND started_at < ?`,
    prevStart,
    startMs,
  );

  const sessions = logs.length;
  const totalVolume = logs.reduce((sum, l) => sum + l.total_volume, 0);
  const prevSessions = prevLogs.length;
  const prevVolume = prevLogs.reduce((sum, l) => sum + l.total_volume, 0);

  let volumeDeltaPct: number | null = null;
  if (prevVolume > 0) {
    volumeDeltaPct = Math.round(((totalVolume - prevVolume) / prevVolume) * 100);
  } else if (totalVolume > 0 && prevSessions > 0) {
    volumeDeltaPct = 100;
  }

  let sessionsDeltaPct: number | null = null;
  if (prevSessions > 0) {
    sessionsDeltaPct = Math.round(((sessions - prevSessions) / prevSessions) * 100);
  } else if (sessions > 0) {
    sessionsDeltaPct = 100;
  }

  const setCount = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM set_entries s
     JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL
       AND s.completed = 1 AND w.started_at >= ? AND w.started_at < ?`,
    startMs,
    endMs,
  );

  const muscleRows = await db.getAllAsync<{ primary_muscle: string; sets: number; volume: number }>(
    `SELECT e.primary_muscle, COUNT(s.id) as sets, COALESCE(SUM(s.weight * s.reps), 0) as volume
     FROM set_entries s
     JOIN workout_logs w ON w.id = s.workout_log_id
     JOIN exercises e ON e.id = s.exercise_id
     WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL
       AND s.completed = 1 AND w.started_at >= ? AND w.started_at < ?
     GROUP BY e.primary_muscle ORDER BY sets DESC`,
    startMs,
    endMs,
  );
  const muscles: MuscleDistribution[] = muscleRows.map((r) => ({
    muscle: r.primary_muscle as MuscleGroup,
    sets: r.sets,
    volume: r.volume,
  }));

  // Best e1RM set per exercise logged this week (window PRs).
  const prRows = await db.getAllAsync<{
    exerciseId: number;
    name: string;
    weight: number;
    reps: number;
    created_at: number;
    best_volume: number;
  }>(
    `SELECT e.id as exerciseId, e.name, s.weight, s.reps, s.created_at,
            (s.weight * s.reps) as best_volume
     FROM set_entries s
     JOIN exercises e ON e.id = s.exercise_id
     JOIN workout_logs w ON w.id = s.workout_log_id
     WHERE w.ended_at IS NOT NULL AND w.deleted_at IS NULL AND s.deleted_at IS NULL
       AND s.completed = 1 AND s.weight > 0
       AND s.created_at >= ? AND s.created_at < ?`,
    startMs,
    endMs,
  );
  const bestMap = new Map<number, PR>();
  for (const r of prRows) {
    const oneRM = estimated1RM(r.weight, r.reps);
    const cur = bestMap.get(r.exerciseId);
    if (!cur || oneRM > cur.estimated1RM) {
      bestMap.set(r.exerciseId, {
        exerciseId: r.exerciseId,
        exerciseName: r.name,
        maxWeight: r.weight,
        maxReps: r.reps,
        estimated1RM: oneRM,
        bestSetVolume: r.best_volume,
        achievedAt: r.created_at,
      });
    }
  }
  const prs = [...bestMap.values()].sort((a, b) => b.estimated1RM - a.estimated1RM).slice(0, 8);

  const volumeLabel = formatVolume(totalVolume, unit);
  const line = insightLine({
    sessions,
    volumeLabel,
    volumeDeltaPct,
    prCount: prs.length,
  });

  return {
    weekStart,
    weekStartMs: startMs,
    weekEndMs: endMs,
    sessions,
    totalVolume,
    totalSets: setCount?.c ?? 0,
    streak: await getStreak(),
    volumeDeltaPct,
    sessionsDeltaPct,
    prs,
    muscles,
    insightLine: line,
  };
}

/** Short notification body for the Sunday digest. */
export function weeklyDigestNotificationBody(recap: WeeklyRecap, unit: Unit): string {
  if (recap.sessions === 0) {
    return 'Quiet week so far — a short session still counts.';
  }
  const volumeLabel = formatVolume(recap.totalVolume, unit);
  return `${recap.sessions} session${recap.sessions === 1 ? '' : 's'} · ${volumeLabel}. ${recap.insightLine}`;
}
