// scripts/update-status.js
// Career Assistant — Update Role Status
//
// Usage:
//   node scripts/update-status.js --id <id> --status <status>
//   node scripts/update-status.js --id <id> --status Skipped --reasons "Wrong Industry" "Compensation" --notes "Below floor"
//   node scripts/update-status.js --id <id> --status Closed --termination "Screened Out"

const Database = require('better-sqlite3');
const path = require('path');

const VALID_STATUSES = [
  'Resume Needed', 'Resume Ready', 'Applied', 'Callback',
  'In Interview', 'Offer Accepted', 'Offer Declined', 'Skipped', 'Closed', 'On Hold',
  'Pending Triage'
];

const VALID_SKIP_REASONS = [
  'Wrong Industry', 'Culture', 'Ethics - Exploitative Industry/Product',
  'Ethics - Defense/Military', 'Ethics - Surveillance', 'Ethics - Other',
  'Location', 'Compensation', 'Skills Gap', 'Other', 'Unknown'
];

const VALID_TERMINATION_REASONS = [
  'Screened Out', 'Filled', 'Cancelled', 'Abandoned',
  'Withdrew - Ethics - Exploitative Industry/Product',
  'Withdrew - Ethics - Defense/Military',
  'Withdrew - Ethics - Surveillance',
  'Withdrew - Ethics - Other',
  'Withdrew - Culture',
  'Withdrew - Compensation',
  'Withdrew - Skills Gap',
  'Withdrew - Location',
  'Withdrew - Other'
];

// ─── Parse args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = { reasons: [], termination: [] };
let i = 0;

while (i < args.length) {
  const flag = args[i].replace('--', '');
  i++;
  const values = [];
  while (i < args.length && !args[i].startsWith('--')) {
    values.push(args[i]);
    i++;
  }
  if (flag === 'reasons' || flag === 'termination') {
    flags[flag] = values;
  } else {
    flags[flag] = values[0];
  }
}

// ─── Validate ─────────────────────────────────────────────────────────────────

if (!flags.id || !flags.status) {
  console.error('Usage: node scripts/update-status.js --id <id> --status <status> [--reasons ...] [--termination ...] [--note <text>]');
  process.exit(1);
}

if (!VALID_STATUSES.includes(flags.status)) {
  console.error(`Invalid status: "${flags.status}"`);
  console.error(`Valid statuses: ${VALID_STATUSES.join(', ')}`);
  process.exit(1);
}

for (const r of flags.reasons) {
  if (!VALID_SKIP_REASONS.includes(r)) {
    console.error(`Invalid skip reason: "${r}"`);
    console.error(`Valid reasons: ${VALID_SKIP_REASONS.join(', ')}`);
    process.exit(1);
  }
}

for (const t of flags.termination) {
  if (!VALID_TERMINATION_REASONS.includes(t)) {
    console.error(`Invalid termination reason: "${t}"`);
    console.error(`Valid reasons: ${VALID_TERMINATION_REASONS.join(', ')}`);
    process.exit(1);
  }
}

// ─── Execute ──────────────────────────────────────────────────────────────────

const db = new Database(path.join(__dirname, '../db/jobsearch.sqlite'));

const role = db.prepare(`SELECT id, company, title, role_status FROM roles WHERE id = ?`).get(flags.id);

if (!role) {
  console.error(`No role found with ID ${flags.id}`);
  db.close();
  process.exit(1);
}

const update = db.transaction(() => {
  db.prepare(`
    UPDATE roles SET role_status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(flags.status, flags.id);

  for (const reason of flags.reasons) {
    db.prepare(`
      INSERT INTO skip_reasons (role_id, reason, note) VALUES (?, ?, ?)
    `).run(flags.id, reason, flags.note ?? null);
  }

  for (const reason of flags.termination) {
    db.prepare(`
      INSERT INTO termination_reasons (role_id, reason, note) VALUES (?, ?, ?)
    `).run(flags.id, reason, flags.note ?? null);
  }
});

update();

console.log(`\n✓ Updated: ${role.company}${role.title ? ' — ' + role.title : ''}`);
console.log(`  ${role.role_status} → ${flags.status}`);
if (flags.reasons.length) console.log(`  Skip reasons: ${flags.reasons.join(', ')}`);
if (flags.termination.length) console.log(`  Termination reasons: ${flags.termination.join(', ')}`);
if (flags.note) console.log(`  Note: ${flags.note}`);
console.log();

db.close();
