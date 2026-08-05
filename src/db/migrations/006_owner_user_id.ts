import type { Migration } from './types';

/**
 * v5 → v6: Track which Clerk user owns local user data (account binding).
 * Stored in schema_meta; no table column required.
 */
export const migration006: Migration = {
  version: 6,
  name: 'owner_user_id_meta',
  async up(_db) {
    // schema_meta already exists; bindLocalAccount writes the key at runtime.
  },
};
