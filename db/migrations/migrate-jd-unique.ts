// db/migrations/migrate-jd-unique.ts
// Migration: Add UNIQUE constraint to job_descriptions.role_id
//
// SQLite does not support ALTER TABLE ADD CONSTRAINT.
// The standard approach is to recreate the table with the new constraint.
//
// Run once:
//   npx ts-node db/migrations/migrate-jd-unique.ts

import Database from 'better-sqlite3';
import path     from 'path';

const db = new Database(path.join(__dirname, '../jobsearch.sqlite'));

console.log('Starting migration: add UNIQUE constraint to job_descriptions.role_id...');

const migrate = db.transaction(() => {

  // Step 1 — Rename existing table
  db.exec(`ALTER TABLE job_descriptions RENAME TO job_descriptions_old;`);

  // Step 2 — Create new table with UNIQUE constraint
  db.exec(`
    CREATE TABLE job_descriptions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id   INTEGER NOT NULL UNIQUE REFERENCES roles(id),
      content   TEXT NOT NULL DEFAULT ''
    );
  `);

  // Step 3 — Copy data
  db.exec(`
    INSERT INTO job_descriptions (id, role_id, content)
    SELECT id, role_id, content
    FROM job_descriptions_old;
  `);

  // Step 4 — Drop old table
  db.exec(`DROP TABLE job_descriptions_old;`);

});

migrate();

console.log('Migration complete.');
db.close();