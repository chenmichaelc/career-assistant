// scripts/import-roles.js
// Career Assistant — Batch Role Importer
// Reads a notes file from stdin and imports all valid roles into the database.
//
// Usage:
//   node scripts/import-roles.js < roles.txt
//   cat roles.txt | node scripts/import-roles.js
//
// Notes file format:
//   URL: <url>
//   Company: <company>
//   Title: <title>
//   Salary Min: <number>
//   Salary Max: <number>
//   Description:
//   <multiline job description>
//
//   --

const Database  = require('better-sqlite3');
const path      = require('path');
const { addRole } = require('../lib/roles');

const db = new Database(path.join(__dirname, '../db/jobsearch.sqlite'));

// ─── Parse stdin ──────────────────────────────────────────────────────────────

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

// ─── Parse records ────────────────────────────────────────────────────────────

function parseRecords(text) {
  const lines    = text.split('\n');
  const records  = [];
  let current    = null;
  let startLine  = 1;
  let lineNumber = 0;
  let inJd       = false;

  for (const line of lines) {
    lineNumber++;

    if (line.trim() === '--') {
      if (current !== null) {
        if (current.jd !== null) {
          current.jd = current.jd.trim();
        }
        records.push(current);
      }
      current    = null;
      inJd       = false;
      startLine  = lineNumber + 1;
      continue;
    }

    if (current === null) {
      current = {
        company:      null,
        title:        null,
        url:          null,
        role_status:  'Pending Triage',
        salary_min:   null,
        salary_max:   null,
        jd:           null,
        candidacy:    null,
        notes:        null,
        _startLine:   startLine,
      };
    }

    if (inJd) {
      current.jd = (current.jd === null ? '' : current.jd) + line + '\n';
      continue;
    }

    const urlMatch        = line.match(/^URL:\s*(.*)$/i);
    const companyMatch    = line.match(/^Company:\s*(.*)$/i);
    const titleMatch      = line.match(/^Title:\s*(.*)$/i);
    const salaryMinMatch  = line.match(/^Salary Min:\s*(.*)$/i);
    const salaryMaxMatch  = line.match(/^Salary Max:\s*(.*)$/i);
    const descMatch       = line.match(/^Description:\s*$/i);

    if (urlMatch) {
      const value   = urlMatch[1].trim();
      current.url   = value !== '' ? value : null;
    } else if (companyMatch) {
      const value      = companyMatch[1].trim();
      current.company  = value !== '' ? value : null;
    } else if (titleMatch) {
      const value    = titleMatch[1].trim();
      current.title  = value !== '' ? value : null;
    } else if (salaryMinMatch) {
      const value        = parseInt(salaryMinMatch[1].trim(), 10);
      current.salary_min = isNaN(value) ? null : value;
    } else if (salaryMaxMatch) {
      const value        = parseInt(salaryMaxMatch[1].trim(), 10);
      current.salary_max = isNaN(value) ? null : value;
    } else if (descMatch) {
      inJd       = true;
      current.jd = '';
    }
  }

  // Handle file that doesn't end with --
  if (current !== null) {
    if (current.jd !== null) {
      current.jd = current.jd.trim();
    }
    records.push(current);
  }

  return records;
}

// ─── Import records ───────────────────────────────────────────────────────────

function importRecords(records) {
  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < records.length; i++) {
    const record     = records[i];
    const recordNum  = i + 1;
    const startLine  = record._startLine;

    // Remove internal tracking field before passing to addRole
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
