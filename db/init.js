// db/init.js
// Career Assistant — Database Initialization
// Run once to create the schema. Safe to re-run (uses IF NOT EXISTS).

const Database  = require('better-sqlite3');
const path      = require('path');
const { schema } = require('./schema');

const db = new Database(path.join(__dirname, 'jobsearch.sqlite'));

db.exec(schema);

console.log('Database initialized successfully.');
db.close();
