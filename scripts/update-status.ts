// scripts/update-status.ts
// Career Assistant — Update Role Status
//
// Usage:
//   npx ts-node scripts/update-status.ts --id <id> --status <status>
//   npx ts-node scripts/update-status.ts --id <id> --status Skipped --reasons "Wrong Industry" --note "Below floor"
//   npx ts-node scripts/update-status.ts --id <id> --status Closed --termination "Screened Out"

import Database          from 'better-sqlite3';
import path              from 'path';
import { parseArgs }     from '../lib/args/update-args';
import { updateRole }    from '../lib/updates';

const db    = new Database(path.join(__dirname, '../db/career-assistant.sqlite'));
const flags = parseArgs(process.argv.slice(2));

try {
  const role = updateRole(db, flags);

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
}
 catch (err) {
  process.stderr.write(`Error: ${(err as Error).message}\n`);
  db.close();
  process.exit(1);
}

db.close();