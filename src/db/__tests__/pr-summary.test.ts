/**
 * Best-1RM SQL should take the max Epley estimate across real sets,
 * never MAX(weight) × MAX(reps) from independent rows.
 */
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import { estimated1RM } from '../calc';

function createPrDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE workout_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE set_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_log_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      set_index INTEGER NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
}

function best1RmSql(db: Database.Database, exerciseId: number) {
  return db
    .prepare(
      `SELECT MAX(s.weight) as max_weight,
              MAX(CASE WHEN s.reps <= 1 THEN s.weight
                       ELSE s.weight * (1.0 + s.reps / 30.0) END) as best_1rm
       FROM set_entries s JOIN workout_logs w ON w.id = s.workout_log_id
       WHERE s.exercise_id = ? AND w.ended_at IS NOT NULL AND s.completed = 1`,
    )
    .get(exerciseId) as { max_weight: number; best_1rm: number };
}

describe('best 1RM SQL', () => {
  it('does not invent a set from independent MAX(weight) and MAX(reps)', () => {
    const db = createPrDb();
    const now = Date.now();
    const log = db
      .prepare(`INSERT INTO workout_logs (name, started_at, ended_at, created_at) VALUES ('Bench', ?, ?, ?)`)
      .run(now, now, now);
    const logId = Number(log.lastInsertRowid);

    // Heaviest: 10 kg × 1. High-rep: 5 kg × 5. Never logged 10×5.
    db.prepare(
      `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, created_at)
       VALUES (?, 1, 0, 10, 1, 1, ?), (?, 1, 1, 5, 5, 1, ?)`,
    ).run(logId, now, logId, now);

    const row = best1RmSql(db, 1);
    expect(row.max_weight).toBe(10);
    // Correct: max of e1RM(10,1)=10 and e1RM(5,5)=5.83 → 10
    expect(Math.round(row.best_1rm * 100) / 100).toBe(10);
    // Bug would have produced estimated1RM(10, 5) ≈ 11.67
    expect(Math.round(row.best_1rm * 100) / 100).not.toBe(estimated1RM(10, 5));
    db.close();
  });

  it('picks a lighter high-rep set when its e1RM is better', () => {
    const db = createPrDb();
    const now = Date.now();
    const log = db
      .prepare(`INSERT INTO workout_logs (name, started_at, ended_at, created_at) VALUES ('Squat', ?, ?, ?)`)
      .run(now, now, now);
    const logId = Number(log.lastInsertRowid);

    db.prepare(
      `INSERT INTO set_entries (workout_log_id, exercise_id, set_index, weight, reps, completed, created_at)
       VALUES (?, 2, 0, 100, 1, 1, ?), (?, 2, 1, 90, 5, 1, ?)`,
    ).run(logId, now, logId, now);

    const row = best1RmSql(db, 2);
    expect(row.max_weight).toBe(100);
    expect(Math.round(row.best_1rm * 100) / 100).toBe(estimated1RM(90, 5));
    db.close();
  });
});
