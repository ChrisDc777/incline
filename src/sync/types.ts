/** Cloud / outbox table names for syncable entities. */
export type SyncTable =
  | 'profiles'
  | 'user_exercises'
  | 'user_templates'
  | 'user_template_exercises'
  | 'workout_logs'
  | 'set_entries'
  | 'bodyweight_entries'
  | 'body_measurements';

export type SyncOp = 'upsert' | 'delete';

export type ExerciseRef =
  | { ref: 'catalog'; externalId: string }
  | { ref: 'custom'; exerciseUuid: string }
  | { ref: 'unknown' };

export interface SyncStatus {
  lastPullAt: number | null;
  lastPushAt: number | null;
  cursor: number;
  status: 'idle' | 'syncing' | 'error';
  lastError: string | null;
}
