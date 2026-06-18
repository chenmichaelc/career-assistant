// db/setup.ts
// Career Assistant — Database Setup
// Exports applySchema() for use by server/index.ts and tests/helpers/db.ts.

import Database from 'better-sqlite3';
import { schema } from './schema';

export function applySchema(db: Database.Database): void {
  db.exec(schema);
}
