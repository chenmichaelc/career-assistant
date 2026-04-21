// scripts/list-roles.js
// Career Assistant — List Roles
// Usage: node scripts/list-roles.js [--status <status>] [--company <name>]

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../db/jobsearch.sqlite'), { readonly: true });

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i += 2) {
  flags[args[i].replace('--', '')] = args[i + 1];
}

let query = `SELECT id, company, title, role_status, candidacy, applied_date, salary_min, salary_max FROM roles WHERE 1=1`;
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
  console.log('No roles found.');
  db.close();
  process.exit(0);
}

const col = (str, width) => (str ?? '—').toString().slice(0, width).padEnd(width);

const header = `${'ID'.padEnd(4)}  ${'Company'.padEnd(30)}  ${'Title'.padEnd(40)}  ${'Status'.padEnd(20)}  ${'Candidacy'.padEnd(12)}  ${'Applied'.padEnd(12)}  ${'Salary Range'}`;
const divider = '─'.repeat(header.length);

console.log('\n' + header);
console.log(divider);

for (const r of roles) {
  const salary = r.salary_min || r.salary_max
    ? `$${r.salary_min ? (r.salary_min / 1000).toFixed(0) + 'K' : '?'}–$${r.salary_max ? (r.salary_max / 1000).toFixed(0) + 'K' : '?'}`
    : '—';

  console.log(
    `${col(r.id, 4)}  ${col(r.company, 30)}  ${col(r.title, 40)}  ${col(r.role_status, 20)}  ${col(r.candidacy, 12)}  ${col(r.applied_date, 12)}  ${salary}`
  );
}

console.log(divider);
console.log(`${roles.length} role(s) found.\n`);

db.close();
