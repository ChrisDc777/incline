import { ensureSyncSchema } from '../ensure-sync-schema';
import type { Migration } from './types';

/**
 * v6 → v7: Sync readiness — UUIDs, updated_at on child tables, soft deletes,
 * template is_custom, sync_outbox. Column work is idempotent via ensureSyncSchema;
 * UUID backfill runs on every open via ensureSyncUuids.
 */
export const migration007: Migration = {
  version: 7,
  name: 'sync_readiness',
  async up(db) {
    await ensureSyncSchema(db);
  },
};
