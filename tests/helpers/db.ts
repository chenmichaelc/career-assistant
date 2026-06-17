// tests/helpers/db.ts
// Career Assistant — Test DB helper
// Creates a fresh in-memory SQLite instance using the real schema.

import Database from 'better-sqlite3';
import { schema } from '../../db/schema';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(schema);
  return db;
}
