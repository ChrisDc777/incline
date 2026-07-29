import { openDatabase } from './client';

/**
 * SQLite-backed key/value store used as the persistence layer for Zustand
 * (settings + active workout id). This replaces AsyncStorage so the whole app
 * has a single persistence mechanism.
 */
export const kvStorage = {
  async getItem(key: string): Promise<string | null> {
    const db = await openDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM kv WHERE key = ?',
      key,
    );
    return row?.value ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    const db = await openDatabase();
    await db.runAsync(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value,
    );
  },

  async removeItem(key: string): Promise<void> {
    const db = await openDatabase();
    await db.runAsync('DELETE FROM kv WHERE key = ?', key);
  },
};
