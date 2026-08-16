import { openDatabase } from '../../client';
import { startOfDay, weekdayMon1 } from '../../calc';
import { getSuggestedTemplate } from '../templates';
import {
  getActiveProgramState,
  getProgram,
} from '../programs';
import { kvStorage } from '../../kv';
import {
  detectProgramPlanDiff,
  PLAN_APPLIED_KEY,
  PLAN_SNOOZE_KEY,
  type ProgramPlanDiff,
} from '@/coaching/program-plan';
import { detectDeload } from '@/coaching/deload';
import { getProgressStats, getStreak } from '../progress';

/** Finished workout day anchors for program miss detection. */
async function trainedDayStartsSince(sinceMs: number): Promise<number[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ started_at: number }>(
    `SELECT started_at FROM workout_logs
     WHERE ended_at IS NOT NULL AND deleted_at IS NULL AND started_at >= ?
     ORDER BY started_at DESC`,
    sinceMs,
  );
  const days = new Set<number>();
  for (const r of rows) days.add(startOfDay(r.started_at));
  return [...days];
}

/** Build a user-confirmable program week diff for the active custom program. */
export async function getActiveProgramPlanDiff(now = Date.now()): Promise<ProgramPlanDiff | null> {
  const active = await getActiveProgramState();
  if (!active) return null;
  const program = await getProgram(active.programId);
  if (!program?.isCustom) return null;

  const [snoozeRaw, appliedRaw, streak, stats, suggested, trained] = await Promise.all([
    kvStorage.getItem(PLAN_SNOOZE_KEY),
    kvStorage.getItem(PLAN_APPLIED_KEY),
    getStreak(now),
    getProgressStats(8),
    getSuggestedTemplate(),
    trainedDayStartsSince(now - 21 * 86_400_000),
  ]);

  const deload = detectDeload({
    weeklyStreak: streak,
    weeklyVolumes: stats.weeklyVolume ?? [],
    now,
  });

  const today = startOfDay(now);
  const anchor = startOfDay(active.startedAt);
  const elapsedDays = Math.max(0, Math.floor((today - anchor) / 86_400_000));
  const week = (Math.floor(elapsedDays / 7) % Math.max(1, program.weeks)) + 1;
  const day = weekdayMon1(today);
  const todaySlot = (program.workouts ?? []).find((w) => w.week === week && w.day === day);

  return detectProgramPlanDiff({
    programId: program.id,
    programName: program.name,
    isCustom: program.isCustom,
    weeks: program.weeks,
    startedAt: active.startedAt,
    slots: (program.workouts ?? []).map((w) => ({
      week: w.week,
      day: w.day,
      templateId: w.templateId,
      templateName: w.templateName ?? 'Workout',
    })),
    trainedDayStarts: trained,
    deloadSourceTemplateId: todaySlot?.templateId ?? suggested?.id ?? null,
    deloadSourceTemplateName: todaySlot?.templateName ?? suggested?.name ?? null,
    suggestDeload: !!deload,
    snoozeUntil: snoozeRaw ? Number(snoozeRaw) : null,
    lastAppliedAt: appliedRaw ? Number(appliedRaw) : null,
    now,
  });
}
