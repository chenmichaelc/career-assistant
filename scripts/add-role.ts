// scripts/add-role.ts
// Career Assistant — Add Role
// Reads a JSON role object from stdin and inserts it into the database.
//
// Usage:
//   cat role.json | ts-node scripts/add-role.ts
//   ts-node scripts/add-role.ts < role.json

import Database from 'better-sqlite3';
import path from 'path';
import { addRole } from '../lib/roles';
import { RoleInput } from '../lib/types';

const db = new Database(path.join(__dirname, '../db/career-assistant.sqlite'));

let raw = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk: string) => {
  raw += chunk;
});

process.stdin.on('end', () => {
  let role: RoleInput;

  try {
    role = JSON.parse(raw) as RoleInput;
  } catch {
    process.stderr.write('Error: Invalid JSON input.\n');
    db.close();
    process.exit(1);
  }

  try {
    const id = addRole(db, role);
    process.stdout.write(`${id}\n`);
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    db.close();
    process.exit(1);
  }

  db.close();
});
