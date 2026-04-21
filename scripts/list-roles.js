// scripts/list-roles.js
// Career Assistant — List Roles (CSV output)
// Usage:
//   node scripts/list-roles.js
//   node scripts/list-roles.js --status Applied
//   node scripts/list-roles.js --company Akamai
//   node scripts/list-roles.js --status Skipped > skipped.csv

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../db/jobsearch.sqlite'), { readonly: true });

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i += 2) {
  flags[args[i].replace('--', '')] = args[i + 1];
}

let query = `SELECT id, company, title, role_status, candidacy, applied_date, salary_min, salary_max, notes FROM roles WHERE 1=1`;
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

const roles = db.prepare(query).all(...params);

if (roles.length === 0) {
  process.stderr.write('No roles found.\n');
  db.close();
  process.exit(0);
}

const escape = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const headers = ['id', 'company', 'title', 'role_status', 'candidacy', 'applied_date', 'salary_min', 'salary_max', 'notes'];

console.log(headers.join(','));

for (const r of roles) {
  console.log(headers.map(h => escape(r[h])).join(','));
}

db.close();
