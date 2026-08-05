import { openDatabase } from '../client';

export async function addBodyweightEntry(weight: number, unit: string): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  await db.runAsync('INSERT INTO bodyweight_entries (weight, unit, recorded_at, created_at) VALUES (?, ?, ?, ?)', weight, unit, now, now);
}

export async function getBodyweightEntries(limit = 90): Promise<{ id: number; weight: number; unit: string; recordedAt: number }[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ id: number; weight: number; unit: string; recorded_at: number }>(
    'SELECT id, weight, unit, recorded_at FROM bodyweight_entries ORDER BY recorded_at DESC LIMIT ?', limit,
  );
  return rows.map((r) => ({ id: r.id, weight: r.weight, unit: r.unit, recordedAt: r.recorded_at }));
}

export async function getLatestBodyweight(): Promise<number | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ weight: number }>('SELECT weight FROM bodyweight_entries ORDER BY recorded_at DESC LIMIT 1');
  return row?.weight ?? null;
}

export async function deleteBodyweightEntry(id: number): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM bodyweight_entries WHERE id = ?', id);
}
