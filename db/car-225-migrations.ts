// db/car-225-migrations.ts
// Temporary, CAR-225-scoped column migrations.
//
// job_stubs and roles both shipped before CAR-284/285/286 added the columns
// listed below. CREATE TABLE IF NOT EXISTS never alters a table that already
// exists, so a database created before those tickets never gets the new
// columns from schema.ts alone. These migrations backfill them.
//
// Deliberately NOT wired into applySchema() — this is an explicit, separate
// operation (`npm run car-225-migrate`), run by hand against a specific
// database, never automatically on server start or npm run init.
//
// Temporary: delete this file, scripts/car-225-migrate.ts, its npm script
// entry, and its test file once CAR-225 is complete AND this has been
// confirmed applied against every real database that needs it (not just
// once the feature code merges) — tracked in CAR-289.

import Database from 'better-sqlite3';

export interface ColumnMigration {
  table: string;
  column: string;
  definition: string;
}

export const COLUMN_MIGRATIONS: ColumnMigration[] = [
  { table: 'roles', column: 'location', definition: 'TEXT' },
  { table: 'job_stubs', column: 'parsed_location', definition: 'TEXT' },
  {
    table: 'roles',
    column: 'in_office_expectation',
    definition: `TEXT CHECK(in_office_expectation IN ('Remote', 'Hybrid', 'In-Office', 'Unknown'))`,
  },
  {
    table: 'job_stubs',
    column: 'parsed_in_office_expectation',
    definition: `TEXT CHECK(parsed_in_office_expectation IN ('Remote', 'Hybrid', 'In-Office', 'Unknown'))`,
  },
];

function tableExists(db: Database.Database, table: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table);
  return row !== undefined;
}

export function applyColumnMigrations(db: Database.Database): void {
  for (const migration of COLUMN_MIGRATIONS) {
    // A table that doesn't exist at all isn't this function's job to create —
    // that's schema.ts's CREATE TABLE, applied via applySchema(). Skip rather
    // than fail: the real prod database, for example, has `roles` but no
    // `job_stubs` table yet, and running this script there should migrate
    // what exists, not crash on what doesn't.
    if (!tableExists(db, migration.table)) {
      continue;
    }

    const columns = db.prepare(`PRAGMA table_info(${migration.table})`).all() as { name: string }[];
    const exists = columns.some((column) => column.name === migration.column);
    if (!exists) {
      db.exec(
        `ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.definition}`
      );
    }
  }
}
