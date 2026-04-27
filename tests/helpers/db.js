// tests/helpers/db.js
// Career Assistant — Test DB helper
// Creates a fresh in-memory SQLite instance using the real schema.
// Import this in any test that needs a DB.

const Database   = require('better-sqlite3');
const { schema } = require('../../db/schema');

function createTestDb() {
  const db = new Database(':memory:');
  db.exec(schema);
  return db;
}

module.exports = { createTestDb };
