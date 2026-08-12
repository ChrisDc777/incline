import type { Unit } from '@/db/types';

export const COACHING_RULE_VERSION = '1.0.0';

export type ReasonCode =
  | 'no_history'
  | 'hold_weight_add_reps'
  | 'hit_rep_range_increase_load'
  | 'partial_miss_hold'
  | 'all_sets_maxed';

export type InsightSeverity = 'info' | 'success' | 'warning';

export type CoachingInsightKind =
  | 'overload_ready'
  | 'recovery_gap'
  | 'volume_trend'
  | 'weekly_goal'
  | 'post_session';

export interface TrainingSuggestion {
  exerciseId: number;
  exerciseName: string;
  weight: number;
  reps: number;
  targetSets: number;
  reasonCode: ReasonCode;
  reasonText: string;
  ruleVersion: string;
}

export interface CoachingInsight {
  id: string;
  kind: CoachingInsightKind;
  severity: InsightSeverity;
  title: string;
  body: string;
  href?: string;
  ruleVersion: string;
}

export interface LastWorkingSet {
  weight: number;
  reps: number;
}

export interface OverloadInput {
  exerciseId: number;
  exerciseName: string;
  lastWorkingSets: LastWorkingSet[];
  targetRepsMin: number;
  targetRepsMax: number;
  targetSets: number;
  unit: Unit;
}
