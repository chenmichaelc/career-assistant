// scripts/car-225-migrate.ts
// Career Assistant — CAR-225 column migration script
// Temporary. Run via: npm run car-225-migrate
//
// Adds the roles/job_stubs columns CAR-284/285/286 introduced to a database
// created before those tickets shipped. Idempotent — safe to run against a
// fresh database (no-op) or an already-migrated one (also a no-op).
//
// Deliberately a separate, explicit command — never run automatically by
// npm run init or by the server on startup. Point it at a specific database
// with DB_PATH, e.g.:
//   DB_PATH=./db/career-assistant-prod.sqlite npm run car-225-migrate
//
// Delete this file once CAR-289's acceptance criteria are met.

import Database from 'better-sqlite3';
import path from 'path';
import { applyColumnMigrations } from '../db/car-225-migrations';

const dbPath = process.env.DB_PATH ?? path.join(__dirname, '../db/career-assistant.sqlite');
const db = new Database(dbPath);

applyColumnMigrations(db);

console.log(`CAR-225 column migrations applied to ${dbPath}.`);
db.close();
