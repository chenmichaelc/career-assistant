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

let query = `SELECT * FROM termination_reasons WHERE 1=1`;

const params = [];

if (flags.status) {
  query += ` AND role_status = ?`;
  params.push(flags.status);
}

if (flags.company) {
  query += ` AND company LIKE ?`;
  params.push(`%${flags.company}%`);
}

query += ` ORDER BY id ASC`;

const resultsJson = db.prepare(query).all(...params);

if (resultsJson.length === 0) {
  process.stderr.write('No roles found.\n');
  db.close();
  process.exit(0);
}

console.log(resultsJson)

db.close();
