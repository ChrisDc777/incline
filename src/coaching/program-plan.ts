import { startOfDay, weekdayMon1 } from '@/db/calc';
import { COACHING_RULE_VERSION, type CoachingInsight } from './types';

export const PLAN_SNOOZE_KEY = 'coaching.programPlan.snoozeUntil';
export const PLAN_APPLIED_KEY = 'coaching.programPlan.lastAppliedAt';

const SNOOZE_MS = 3 * 86_400_000;
const LOOKBACK_DAYS = 3;

export type ProgramPlanKind = 'catch_up' | 'deload_insert';

export interface ProgramPlanDiff {
  kind: ProgramPlanKind;
  title: string;
  body: string;
  programId: number;
  programName: string;
  /** Week/day to write on confirm (custom programs only). */
  targetWeek: number;
  targetDay: number;
  templateId: number;
  templateName: string;
  /** Optional: clear the missed slot after catching up. */
  clearWeek?: number;
  clearDay?: number;
}

export interface ProgramDaySlot {
  week: number;
  day: number;
  templateId: number;
  templateName: string;
}

export interface ProgramPlanInput {
  programId: number;
  programName: string;
  isCustom: boolean;
  weeks: number;
  /** Activation anchor (local midnight). */
  startedAt: number;
  slots: ProgramDaySlot[];
  /** Calendar day starts (local midnight) that already have a finished workout. */
  trainedDayStarts: number[];
  /** Template to use for a lighter day when inserting a deload. */
  deloadSourceTemplateId?: number | null;
  deloadSourceTemplateName?: string | null;
  suggestDeload?: boolean;
  snoozeUntil?: number | null;
  lastAppliedAt?: number | null;
  now?: number;
}

function programWeekDay(startedAt: number, dayStart: number, weeks: number): { week: number; day: number } {
  const anchor = startOfDay(startedAt);
  const elapsedDays = Math.max(0, Math.floor((dayStart - anchor) / 86_400_000));
  const week = (Math.floor(elapsedDays / 7) % Math.max(1, weeks)) + 1;
  const day = weekdayMon1(dayStart);
  return { week, day };
}

function hasTraining(trained: Set<number>, dayStart: number): boolean {
  return trained.has(dayStart);
}

/**
 * Propose one user-confirmed plan change at a time.
 * Catch-up wins over deload insert when both apply.
 */
export function detectProgramPlanDiff(input: ProgramPlanInput): ProgramPlanDiff | null {
  const now = input.now ?? Date.now();
  if (input.snoozeUntil != null && input.snoozeUntil > now) return null;
  if (input.lastAppliedAt != null && now - input.lastAppliedAt < SNOOZE_MS) return null;
  if (!input.isCustom || input.slots.length === 0) return null;

  const trained = new Set(input.trainedDayStarts.map((d) => startOfDay(d)));
  const today = startOfDay(now);

  // --- Catch-up: missed a programmed day in the last few days ---
  for (let back = 1; back <= LOOKBACK_DAYS; back++) {
    const dayStart = today - back * 86_400_000;
    const { week, day } = programWeekDay(input.startedAt, dayStart, input.weeks);
    const slot = input.slots.find((s) => s.week === week && s.day === day);
    if (!slot) continue;
    if (hasTraining(trained, dayStart)) continue;

    // Prefer today if rest; else next rest day later this calendar week (Mon-Sun).
    const candidates: number[] = [];
    for (let i = 0; i < 7; i++) {
      const t = today + i * 86_400_000;
      candidates.push(t);
    }
    let target: { week: number; day: number; dayStart: number } | null = null;
    for (const dayStartCand of candidates) {
      const pos = programWeekDay(input.startedAt, dayStartCand, input.weeks);
      const occupied = input.slots.some((s) => s.week === pos.week && s.day === pos.day);
      const alreadyTrained = hasTraining(trained, dayStartCand);
      if (!occupied && !alreadyTrained) {
        target = { ...pos, dayStart: dayStartCand };
        break;
      }
      // Today already has a different slot — still allow overwrite only on a rest day.
    }

    if (!target) continue;

    return {
      kind: 'catch_up',
      title: 'Catch up a missed day?',
      body: `You missed ${slot.templateName}. Place it on the next open day — nothing changes until you confirm.`,
      programId: input.programId,
      programName: input.programName,
      targetWeek: target.week,
      targetDay: target.day,
      templateId: slot.templateId,
      templateName: slot.templateName,
      clearWeek: week,
      clearDay: day,
    };
  }

  // --- Deload insert: lighter day on next open slot ---
  if (
    input.suggestDeload &&
    input.deloadSourceTemplateId != null &&
    input.deloadSourceTemplateId > 0
  ) {
    for (let i = 0; i < 7; i++) {
      const dayStart = today + i * 86_400_000;
      const pos = programWeekDay(input.startedAt, dayStart, input.weeks);
      const occupied = input.slots.some((s) => s.week === pos.week && s.day === pos.day);
      if (occupied || hasTraining(trained, dayStart)) continue;
      return {
        kind: 'deload_insert',
        title: 'Add a lighter day?',
        body: `Insert a ~60% deload of ${input.deloadSourceTemplateName ?? 'your routine'} on the next open day. Original slots stay until you confirm.`,
        programId: input.programId,
        programName: input.programName,
        targetWeek: pos.week,
        targetDay: pos.day,
        templateId: input.deloadSourceTemplateId,
        templateName: input.deloadSourceTemplateName ?? 'Deload',
      };
    }
  }

  return null;
}

export function programPlanInsight(diff: ProgramPlanDiff): CoachingInsight {
  return {
    id: `program-plan-${diff.kind}`,
    kind: 'program_plan',
    severity: 'warning',
    title: diff.title,
    body: diff.body,
    href: `/(app)/program-adjust?kind=${diff.kind}`,
    ruleVersion: COACHING_RULE_VERSION,
  };
}

export function planSnoozeUntil(now = Date.now()): number {
  return now + SNOOZE_MS;
}
