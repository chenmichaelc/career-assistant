// scripts/import-roles.ts
// Career Assistant — Batch Role Importer
// Reads a notes file from stdin and imports all valid roles into the database.
//
// Usage:
//   ts-node scripts/import-roles.ts < roles.txt
//   cat roles.txt | ts-node scripts/import-roles.ts

import Database           from 'better-sqlite3';
import path               from 'path';
import { addRole }        from '../lib/roles';
import { parseRecords, ParsedRecord } from '../lib/parse-records';
import { RoleInput }      from '../lib/types';

const db = new Database(path.join(__dirname, '../db/career-assistant.sqlite'));

let raw = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk: string) => {
  raw += chunk;
});

process.stdin.on('end', () => {
  const records = parseRecords(raw);
  importRecords(records);
  db.close();
});

function importRecords(records: ParsedRecord[]): void {
  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < records.length; i++) {
    const record    = records[i];
    const recordNum = i + 1;
    const startLine = record._startLine;

    const { _startLine, ...role } = record;
    const roleInput = role as unknown as RoleInput;

    try {
      const id = addRole(db, roleInput);
      process.stdout.write(`Inserted: ${id} — ${role.company} — ${role.title}\n`);
      inserted++;
    } catch (err) {
      process.stdout.write(`Skipped:  record ${recordNum} (line ${startLine}) — ${(err as Error).message}\n`);
      skipped++;
    }
  }

  process.stdout.write(`\nSummary: ${inserted} inserted, ${skipped} skipped.\n`);
}
