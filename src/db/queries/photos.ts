import { copyAsync, deleteAsync, documentDirectory, makeDirectoryAsync } from 'expo-file-system/legacy';

import { newUuid } from '@/lib/uuid';
import type { WorkoutPhoto } from '../types';
import { openDatabase } from '../client';

export const MAX_SESSION_PHOTOS = 6;

interface PhotoRow {
  id: number;
  workout_log_id: number;
  uri: string;
  sort_order: number;
  created_at: number;
}

function mapPhoto(r: PhotoRow): WorkoutPhoto {
  return {
    id: r.id,
    workoutLogId: r.workout_log_id,
    uri: r.uri,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  };
}

export async function listWorkoutPhotos(logId: number): Promise<WorkoutPhoto[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<PhotoRow>(
    `SELECT id, workout_log_id, uri, sort_order, created_at
     FROM workout_photos
     WHERE workout_log_id = ? AND deleted_at IS NULL
     ORDER BY sort_order, id`,
    logId,
  );
  return rows.map(mapPhoto);
}

async function persistPhotoFile(logId: number, sourceUri: string): Promise<string> {
  const dir = `${documentDirectory}workout-photos/${logId}/`;
  await makeDirectoryAsync(dir, { intermediates: true });
  const ext = sourceUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const dest = `${dir}${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
  await copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function addWorkoutPhotos(logId: number, sourceUris: string[]): Promise<WorkoutPhoto[]> {
  const existing = await listWorkoutPhotos(logId);
  const room = MAX_SESSION_PHOTOS - existing.length;
  if (room <= 0 || sourceUris.length === 0) return existing;

  const db = await openDatabase();
  const now = Date.now();
  let sort = existing.length === 0 ? 0 : existing[existing.length - 1].sortOrder + 1;
  const added: WorkoutPhoto[] = [];

  for (const uri of sourceUris.slice(0, room)) {
    const localUri = await persistPhotoFile(logId, uri);
    const res = await db.runAsync(
      `INSERT INTO workout_photos (workout_log_id, uri, sort_order, uuid, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      logId,
      localUri,
      sort,
      newUuid(),
      now,
      now,
    );
    added.push({
      id: Number(res.lastInsertRowId),
      workoutLogId: logId,
      uri: localUri,
      sortOrder: sort,
      createdAt: now,
    });
    sort += 1;
  }
  return [...existing, ...added];
}

export async function deleteWorkoutPhoto(photoId: number): Promise<void> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<PhotoRow>(
    'SELECT id, workout_log_id, uri, sort_order, created_at FROM workout_photos WHERE id = ? AND deleted_at IS NULL',
    photoId,
  );
  const now = Date.now();
  await db.runAsync(
    'UPDATE workout_photos SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    now,
    now,
    photoId,
  );
  if (row?.uri.includes('workout-photos/')) {
    try {
      await deleteAsync(row.uri, { idempotent: true });
    } catch {
      /* file may already be gone */
    }
  }
}

export async function deletePhotosForWorkout(logId: number): Promise<void> {
  const photos = await listWorkoutPhotos(logId);
  const db = await openDatabase();
  const now = Date.now();
  await db.runAsync(
    'UPDATE workout_photos SET deleted_at = ?, updated_at = ? WHERE workout_log_id = ? AND deleted_at IS NULL',
    now,
    now,
    logId,
  );
  for (const p of photos) {
    if (!p.uri.includes('workout-photos/')) continue;
    try {
      await deleteAsync(p.uri, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
}
