/**
 * Query-layer fixtures against better-sqlite3, mirroring the SQL used by
 * session volume recompute and workout list helpers.
 */
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

function createSessionDb() {
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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE set_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_log_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      set_index INTEGER NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      rest_seconds INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

function recomputeVolume(db: Database.Database, logId: number) {
  const row = db
    .prepare(
      'SELECT COALESCE(SUM(weight * reps), 0) as v FROM set_entries WHERE workout_log_id = ? AND completed = 1',
    )
    .get(logId) as { v: number };
  db.prepare('UPDATE workout_logs SET total_volume = ?, updated_at = ? WHERE id = ?').run(
    row.v,
    Date.now(),
    logId,
  );
  return row.v;
}

describe('session query SQL', () => {
  it('recomputes volume from completed sets only', () => {
    const db = createSessionDb();
    const now = Date.now();
    const info = db
      .prepare(
        `INSERT INTO workout_logs (name, started_at, created_at, updated_at) VALUES ('Push', ?, ?, ?)`,
      )
      .run(now, now, now);
    const logId = Number(info.lastInsertRowid);

    db.prepare(
      `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, created_at)
       VALUES (?, 1, 0, 100, 5, 1, ?), (?, 1, 1, 100, 5, 0, ?)`,
    ).run(logId, now, logId, now);

    const volume = recomputeVolume(db, logId);
    expect(volume).toBe(500);

    const stored = db.prepare('SELECT total_volume FROM workout_logs WHERE id = ?').get(logId) as {
      total_volume: number;
    };
    expect(stored.total_volume).toBe(500);
    db.close();
  });

  it('finds active workout where ended_at IS NULL', () => {
    const db = createSessionDb();
    const now = Date.now();
    db.prepare(
      `INSERT INTO workout_logs (name, started_at, ended_at, created_at, updated_at) VALUES ('Done', ?, ?, ?, ?)`,
    ).run(now - 1000, now, now, now);
    db.prepare(
      `INSERT INTO workout_logs (name, started_at, ended_at, created_at, updated_at) VALUES ('Active', ?, NULL, ?, ?)`,
    ).run(now, now, now);

    const active = db
      .prepare('SELECT name FROM workout_logs WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1')
      .get() as { name: string };
    expect(active.name).toBe('Active');
    db.close();
  });
});
