import type { SQLiteDatabase } from 'expo-sqlite';

/** True if `table` has a column named `column`. */
export async function hasColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

/** True if a table exists in the main schema. */
export async function hasTable(db: SQLiteDatabase, table: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    table,
  );
  return !!row;
}
