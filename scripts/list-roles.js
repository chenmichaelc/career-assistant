// scripts/list-roles.js
// Career Assistant — List Roles (CSV output)
//
// Usage:
//   node scripts/list-roles.js
//   node scripts/list-roles.js --status Applied
//   node scripts/list-roles.js --company Akamai
//   node scripts/list-roles.js --status Skipped > skipped.csv

const Database      = require('better-sqlite3');
const path          = require('path');
const { parseArgs } = require('../lib/args/list-args');

const db    = new Database(path.join(__dirname, '../db/jobsearch.sqlite'), { readonly: true });
const flags = parseArgs(process.argv.slice(2));

let query = `
  SELECT id, company, title, role_status, candidacy, applied_date, salary_min, salary_max, notes
  FROM roles
  WHERE 1=1
`;

const params = [];

if (flags.status) {
  query += ` AND role_status = ?`;
  params.push(flags.status);
}

if (flags.company) {
  query += ` AND company LIKE ?`;
  params.push(`%${flags.company}%`);
}

query += ` ORDER BY applied_date DESC, company ASC`;

const statement = db.prepare(query);
const roles     = statement.all(...params);

if (roles.length === 0) {
  process.stderr.write('No roles found.\n');
  db.close();
  process.exit(0);
}

function escapeCSV(val) {
  if (val === null || val === undefined) {
    return '';
  }

  const str          = String(val);
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n');

  if (needsQuoting) {
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

const headers = ['id', 'company', 'title', 'role_status', 'candidacy', 'applied_date', 'salary_min', 'salary_max', 'notes'];

process.stdout.write(headers.join(',') + '\n');

for (const role of roles) {
  const row = headers.map(header => escapeCSV(role[header]));
  process.stdout.write(row.join(',') + '\n');
}

db.close();
