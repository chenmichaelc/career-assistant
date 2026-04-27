// scripts/add-role.js
// Career Assistant — Add Role
// Reads a JSON role object from stdin and inserts it into the database.
//
// Usage:
//   cat role.json | node scripts/add-role.js
//   node scripts/add-role.js < role.json

const Database    = require('better-sqlite3');
const path        = require('path');
const { addRole } = require('../lib/roles');

const db = new Database(path.join(__dirname, '../db/jobsearch.sqlite'));

let raw = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  raw += chunk;
});

process.stdin.on('end', () => {
  let fields;

  try {
    fields = JSON.parse(raw);
  } catch (err) {
    process.stderr.write('Error: Invalid JSON input.\n');
    db.close();
    process.exit(1);
  }

  try {
    const id = addRole(db, fields);
    process.stdout.write(`${id}\n`);
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    db.close();
    process.exit(1);
  }

  db.close();
});
