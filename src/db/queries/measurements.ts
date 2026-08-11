import { openDatabase } from '../client';
import { newUuid } from '@/lib/uuid';
import type { BodyMeasurementEntry, BodyMetric } from '../types';

type CircumferenceMetric = Exclude<BodyMetric, 'bodyweight'>;

export async function addBodyMeasurement(
  metric: CircumferenceMetric,
  value: number,
  unit: string,
): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  const uuid = newUuid();
  await db.runAsync(
    `INSERT INTO body_measurements (metric, value, unit, recorded_at, uuid, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    metric,
    value,
    unit,
    now,
    uuid,
    now,
    now,
  );
  // Cloud outbox for this table is deferred until sync schema covers it (#57 follow-up).
}

export async function getBodyMeasurements(
  metric: CircumferenceMetric,
  limit = 365,
): Promise<BodyMeasurementEntry[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    metric: string;
    value: number;
    unit: string;
    recorded_at: number;
  }>(
    `SELECT id, metric, value, unit, recorded_at FROM body_measurements
     WHERE deleted_at IS NULL AND metric = ?
     ORDER BY recorded_at DESC LIMIT ?`,
    metric,
    limit,
  );
  return rows.map((r) => ({
    id: r.id,
    metric: r.metric as CircumferenceMetric,
    value: r.value,
    unit: r.unit,
    recordedAt: r.recorded_at,
  }));
}

export async function deleteBodyMeasurement(id: number): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();
  await db.runAsync(
    'UPDATE body_measurements SET deleted_at = ?, updated_at = ? WHERE id = ?',
    now,
    now,
    id,
  );
}
