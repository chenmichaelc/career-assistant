// scripts/init-db.ts
// Career Assistant — Database Initialization Script
// One-time setup script. Run via: npm run init
// Creates db/career-assistant.sqlite with the full schema.

import Database from 'better-sqlite3';
import path from 'path';
import { applySchema } from '../db/setup';

const db = new Database(path.join(__dirname, '../db/career-assistant.sqlite'));

applySchema(db);

console.log('Database initialized successfully.');
db.close();
