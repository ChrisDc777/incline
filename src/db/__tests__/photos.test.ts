/**
 * Progress-photo list SQL against better-sqlite3, mirroring photos.ts joins.
 */
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import {
  groupProgressPhotosByWeek,
  progressPhotoWeekLabel,
  startOfWeekForSettings,
} from '@/lib/progress-photos';
import type { ProgressPhoto } from '@/db/types';

const PROGRESS_PHOTO_SELECT = `
SELECT
  p.id,
  p.workout_log_id,
  p.uri,
  p.sort_order,
  p.created_at,
  w.name AS workout_name,
  w.started_at,
  w.ended_at,
  w.template_id
FROM workout_photos p
INNER JOIN workout_logs w ON w.id = p.workout_log_id
WHERE p.deleted_at IS NULL
  AND w.deleted_at IS NULL
  AND w.ended_at IS NOT NULL`;

const PROGRESS_PHOTO_ORDER = 'ORDER BY w.started_at ASC, p.sort_order, p.id';

function createPhotoDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER,
      name TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      total_volume REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'metric',
      notes TEXT NOT NULL DEFAULT '',
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE workout_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_log_id INTEGER NOT NULL,
      uri TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      uuid TEXT,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT 0
    );
  `);
  return db;
}

function insertLog(
  db: Database.Database,
  opts: {
    name: string;
    startedAt: number;
    endedAt: number | null;
    deletedAt?: number | null;
    templateId?: number | null;
  },
): number {
  const now = opts.startedAt;
  const info = db
    .prepare(
      `INSERT INTO workout_logs
        (template_id, name, started_at, ended_at, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.templateId ?? null,
      opts.name,
      opts.startedAt,
      opts.endedAt,
      opts.deletedAt ?? null,
      now,
      now,
    );
  return Number(info.lastInsertRowid);
}

function insertPhoto(
  db: Database.Database,
  opts: { logId: number; uri: string; sortOrder: number; deletedAt?: number | null; createdAt?: number },
): number {
  const now = opts.createdAt ?? Date.now();
  const info = db
    .prepare(
      `INSERT INTO workout_photos
        (workout_log_id, uri, sort_order, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(opts.logId, opts.uri, opts.sortOrder, opts.deletedAt ?? null, now, now);
  return Number(info.lastInsertRowid);
}

function listProgressPhotos(
  db: Database.Database,
  { offset = 0, limit = 20, sinceMs }: { offset?: number; limit?: number; sinceMs?: number } = {},
) {
  const sinceClause = sinceMs != null && sinceMs > 0 ? ' AND w.started_at >= ?' : '';
  const params: number[] = [];
  if (sinceClause) params.push(sinceMs as number);
  params.push(limit, offset);
  return db
    .prepare(
      `${PROGRESS_PHOTO_SELECT}${sinceClause}
       ${PROGRESS_PHOTO_ORDER}
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as {
    id: number;
    workout_name: string;
    started_at: number;
    sort_order: number;
  }[];
}

function countProgressPhotos(db: Database.Database) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM workout_photos p
       INNER JOIN workout_logs w ON w.id = p.workout_log_id
       WHERE p.deleted_at IS NULL
         AND w.deleted_at IS NULL
         AND w.ended_at IS NOT NULL`,
    )
    .get() as { n: number };
  return row.n;
}

function atNoon(y: number, m: number, d: number): number {
  return new Date(y, m, d, 12, 0, 0).getTime();
}

function fakePhoto(partial: Partial<ProgressPhoto> & Pick<ProgressPhoto, 'id' | 'startedAt'>): ProgressPhoto {
  return {
    workoutLogId: 1,
    uri: `file://${partial.id}.jpg`,
    sortOrder: 0,
    createdAt: partial.startedAt,
    workoutName: 'Push',
    endedAt: partial.startedAt + 1000,
    templateId: null,
    ...partial,
  };
}

describe('progress photo query SQL', () => {
  it('excludes soft-deleted photos, soft-deleted logs, and incomplete logs', () => {
    const db = createPhotoDb();
    const t = Date.now();
    const keep = insertLog(db, { name: 'Keep', startedAt: t, endedAt: t + 1 });
    const incomplete = insertLog(db, { name: 'Active', startedAt: t + 10, endedAt: null });
    const deletedLog = insertLog(db, { name: 'Gone', startedAt: t + 20, endedAt: t + 21, deletedAt: t });

    insertPhoto(db, { logId: keep, uri: 'keep.jpg', sortOrder: 0 });
    insertPhoto(db, { logId: keep, uri: 'deleted.jpg', sortOrder: 1, deletedAt: t });
    insertPhoto(db, { logId: incomplete, uri: 'live.jpg', sortOrder: 0 });
    insertPhoto(db, { logId: deletedLog, uri: 'orphan.jpg', sortOrder: 0 });

    const rows = listProgressPhotos(db);
    expect(rows.map((r) => r.workout_name)).toEqual(['Keep']);
    expect(countProgressPhotos(db)).toBe(1);
    db.close();
  });

  it('orders by session start, then sort_order, then id', () => {
    const db = createPhotoDb();
    const later = insertLog(db, { name: 'Later', startedAt: 2000, endedAt: 2001 });
    const earlier = insertLog(db, { name: 'Earlier', startedAt: 1000, endedAt: 1001 });

    const l0 = insertPhoto(db, { logId: later, uri: 'l0.jpg', sortOrder: 0 });
    const e1 = insertPhoto(db, { logId: earlier, uri: 'e1.jpg', sortOrder: 1 });
    const e0 = insertPhoto(db, { logId: earlier, uri: 'e0.jpg', sortOrder: 0 });

    const rows = listProgressPhotos(db);
    expect(rows.map((r) => r.id)).toEqual([e0, e1, l0]);
    expect(rows.map((r) => r.workout_name)).toEqual(['Earlier', 'Earlier', 'Later']);
    db.close();
  });

  it('paginates with LIMIT/OFFSET and optional sinceMs', () => {
    const db = createPhotoDb();
    const oldLog = insertLog(db, { name: 'Old', startedAt: 1000, endedAt: 1001 });
    const newLog = insertLog(db, { name: 'New', startedAt: 5000, endedAt: 5001 });
    insertPhoto(db, { logId: oldLog, uri: 'a.jpg', sortOrder: 0 });
    insertPhoto(db, { logId: oldLog, uri: 'b.jpg', sortOrder: 1 });
    insertPhoto(db, { logId: newLog, uri: 'c.jpg', sortOrder: 0 });

    const page1 = listProgressPhotos(db, { offset: 0, limit: 2 });
    const page2 = listProgressPhotos(db, { offset: 2, limit: 2 });
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(1);
    expect(page2[0].workout_name).toBe('New');

    const since = listProgressPhotos(db, { sinceMs: 4000 });
    expect(since).toHaveLength(1);
    expect(since[0].workout_name).toBe('New');
    db.close();
  });
});

describe('progress photo week labels', () => {
  it('groups Wednesday and the following Sunday together on Monday start only', () => {
    const wed = atNoon(2026, 7, 12);
    const sun = atNoon(2026, 7, 16);
    const photos = [fakePhoto({ id: 1, startedAt: wed }), fakePhoto({ id: 2, startedAt: sun })];

    const mondayGroups = groupProgressPhotosByWeek(photos, 'monday');
    expect(mondayGroups).toHaveLength(1);
    expect(mondayGroups[0].weekStartMs).toBe(startOfWeekForSettings(wed, 'monday'));

    const sundayGroups = groupProgressPhotosByWeek(photos, 'sunday');
    expect(sundayGroups).toHaveLength(2);
    expect(startOfWeekForSettings(wed, 'sunday')).not.toBe(startOfWeekForSettings(sun, 'sunday'));
  });

  it('labels a Sunday-start week from Sunday, not Monday', () => {
    const sunday = atNoon(2026, 7, 16);
    const mondayStart = startOfWeekForSettings(sunday, 'monday');
    const sundayStart = startOfWeekForSettings(sunday, 'sunday');
    expect(new Date(mondayStart).getDay()).toBe(1);
    expect(new Date(sundayStart).getDay()).toBe(0);
    expect(progressPhotoWeekLabel(sunday, 'sunday')).not.toBe(progressPhotoWeekLabel(sunday, 'monday'));
  });
});
