// db/init.ts
// Career Assistant — Database Initialization
// Run once to create the schema. Safe to re-run (uses IF NOT EXISTS).

import Database from 'better-sqlite3';
import path     from 'path';
import { schema } from './schema';

const db = new Database(path.join(__dirname, 'jobsearch.sqlite'));

db.exec(schema);

console.log('Database initialized successfully.');
db.close();
