// scripts/update-status.js
// Career Assistant — Update Role Status
//
// Usage:
//   node scripts/update-status.js --id <id> --status <status>
//   node scripts/update-status.js --id <id> --status Skipped --reasons "Wrong Industry" "Compensation" --note "Below floor"
//   node scripts/update-status.js --id <id> --status Closed --termination "Screened Out"

const Database      = require('better-sqlite3');
const path          = require('path');
const { parseArgs } = require('../lib/args/update-args');

const db    = new Database(path.join(__dirname, '../db/jobsearch.sqlite'));
const flags = parseArgs(process.argv.slice(2));

if (!flags.id || !flags.status) {
  process.stderr.write('Usage: node scripts/update-status.js --id <id> --status <status> [--reasons ...] [--termination ...] [--note <text>]\n');
  db.close();
  process.exit(1);
}

const fetchRole = db.prepare(`
  SELECT id, company, title, role_status
  FROM roles
  WHERE id = ?
`);

const role = fetchRole.get(flags.id);

if (!role) {
  process.stderr.write(`Error: No role found with ID ${flags.id}\n`);
  db.close();
  process.exit(1);
}

const updateRoleStatus = db.prepare(`
  UPDATE roles
  SET role_status = @role_status,
      updated_at  = datetime('now')
  WHERE id = @id
`);

const insertSkipReason = db.prepare(`
  INSERT INTO skip_reasons (role_id, reason, note)
  VALUES (@role_id, @reason, @note)
`);

const insertTerminationReason = db.prepare(`
  INSERT INTO termination_reasons (role_id, reason, note)
  VALUES (@role_id, @reason, @note)
`);

const run = db.transaction(() => {
  updateRoleStatus.run({
    role_status: flags.status,
    id:          flags.id,
  });

  for (const reason of flags.reasons) {
    insertSkipReason.run({
      role_id: flags.id,
      reason:  reason,
      note:    flags.note ?? null,
    });
  }

  for (const reason of flags.termination) {
    insertTerminationReason.run({
      role_id: flags.id,
      reason:  reason,
      note:    flags.note ?? null,
    });
  }
});

try {
  run();
} catch (err) {
  process.stderr.write(`Error: ${err.message}\n`);
  db.close();
  process.exit(1);
}

process.stdout.write(`\n✓ Updated: ${role.company} — ${role.title}\n`);
process.stdout.write(`  ${role.role_status} → ${flags.status}\n`);

if (flags.reasons.length) {
  process.stdout.write(`  Skip reasons: ${flags.reasons.join(', ')}\n`);
}

if (flags.termination.length) {
  process.stdout.write(`  Termination reasons: ${flags.termination.join(', ')}\n`);
}

if (flags.note) {
  process.stdout.write(`  Note: ${flags.note}\n`);
}

process.stdout.write('\n');
db.close();
