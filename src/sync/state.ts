import { openDatabase } from '@/db/client';
import type { SyncStatus } from './types';

const KEYS = {
  lastPullAt: 'sync_last_pull_at',
  lastPushAt: 'sync_last_push_at',
  cursor: 'sync_cursor',
  status: 'sync_status',
  lastError: 'sync_last_error',
} as const;

async function getMeta(key: string): Promise<string | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM schema_meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    'INSERT INTO schema_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const [lastPull, lastPush, cursor, status, lastError] = await Promise.all([
    getMeta(KEYS.lastPullAt),
    getMeta(KEYS.lastPushAt),
    getMeta(KEYS.cursor),
    getMeta(KEYS.status),
    getMeta(KEYS.lastError),
  ]);
  return {
    lastPullAt: lastPull ? Number(lastPull) : null,
    lastPushAt: lastPush ? Number(lastPush) : null,
    cursor: cursor ? Number(cursor) : 0,
    status: (status as SyncStatus['status']) || 'idle',
    lastError: lastError || null,
  };
}

export async function setSyncStatus(
  patch: Partial<Pick<SyncStatus, 'status' | 'lastError' | 'lastPullAt' | 'lastPushAt' | 'cursor'>>,
): Promise<void> {
  if (patch.status !== undefined) await setMeta(KEYS.status, patch.status);
  if (patch.lastError !== undefined) await setMeta(KEYS.lastError, patch.lastError ?? '');
  if (patch.lastPullAt !== undefined) await setMeta(KEYS.lastPullAt, String(patch.lastPullAt));
  if (patch.lastPushAt !== undefined) await setMeta(KEYS.lastPushAt, String(patch.lastPushAt));
  if (patch.cursor !== undefined) await setMeta(KEYS.cursor, String(patch.cursor));
}

export async function resetSyncState(): Promise<void> {
  const db = await openDatabase();
  for (const key of Object.values(KEYS)) {
    await db.runAsync('DELETE FROM schema_meta WHERE key = ?', key);
  }
}
