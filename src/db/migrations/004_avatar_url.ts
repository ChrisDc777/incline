import type { Migration } from './types';
import { hasColumn } from './helpers';

/** v3 → v4: profile avatar. */
export const migration004: Migration = {
  version: 4,
  name: 'profile_avatar_url',
  async up(db) {
    if (!(await hasColumn(db, 'user_profile', 'avatar_url'))) {
      await db.execAsync('ALTER TABLE user_profile ADD COLUMN avatar_url TEXT');
    }
  },
};
