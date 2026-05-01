// scripts/import-roles.js
// Career Assistant — Batch Role Importer
// Reads a notes file from stdin and imports all valid roles into the database.
//
// Usage:
//   node scripts/import-roles.js < roles.txt
//   node scripts/update-status.js --id 153 --status Applied
//   cat roles.txt | node scripts/import-roles.js

const Database          = require('better-sqlite3');
const path              = require('path');
const { addRole }       = require('../lib/roles');
const { parseRecords }  = require('../lib/parse-records');

const db = new Database(path.join(__dirname, '../db/jobsearch.sqlite'));

let raw = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  raw += chunk;
});

process.stdin.on('end', () => {
  const records = parseRecords(raw);
  importRecords(records);
  db.close();
});

function importRecords(records) {
  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < records.length; i++) {
    const record    = records[i];
    const recordNum = i + 1;
    const startLine = record._startLine;

    const fields = Object.assign({}, record);
    delete fields._startLine;

    try {
      const id = addRole(db, fields);
      process.stdout.write(`Inserted: ${id} — ${fields.company} — ${fields.title}\n`);
      inserted++;
    } catch (err) {
      process.stdout.write(`Skipped:  record ${recordNum} (line ${startLine}) — ${err.message}\n`);
      skipped++;
    }
  }

  process.stdout.write(`\nSummary: ${inserted} inserted, ${skipped} skipped.\n`);
}
