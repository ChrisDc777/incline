import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  /** Target schema version after this migration runs. */
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}
