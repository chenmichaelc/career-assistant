// scripts/delete-skip-reason.ts
// Career Assistant — Delete Skip Reason
//
// Usage:
//   npx ts-node scripts/delete-skip-reason.ts --id <id> --mode preview
//   npx ts-node scripts/delete-skip-reason.ts --id <id>

import Database                                              from 'better-sqlite3';
import path                                                  from 'path';
import { previewSkipReasonDeletion, deleteSkipReason }       from '../lib/deletes';

const args  = process.argv.slice(2);
const flags: Record<string, string> = {};

for (let i = 0; i < args.length; i += 2) {
  flags[args[i].replace('--', '')] = args[i + 1];
}

const isPreview = flags.mode === 'preview';

if (!flags.id || flags.id.trim() === '') {
  process.stderr.write('Error: --id is required.\n');
  process.exit(1);
}

const id = parseInt(flags.id, 10);

if (isNaN(id)) {
  process.stderr.write('Error: --id must be a number.\n');
  process.exit(1);
}

const db = new Database(path.join(__dirname, '../db/jobsearch.sqlite'));

try {
  if (isPreview) {
    const { reason, role } = previewSkipReasonDeletion(db, id);

    process.stdout.write(`\nPreview — Skip Reason ${id}\n`);
    process.stdout.write(`  Reason:  ${reason.reason}\n`);
    process.stdout.write(`  Note:    ${reason.note ?? '—'}\n`);
    process.stdout.write(`  Role:    [${role.id}] ${role.company} — ${role.title}\n`);
    process.stdout.write('\n');
  } else {
    const { reason, role } = deleteSkipReason(db, id);

    process.stdout.write(`\n✓ Deleted skip reason ${id} — ${reason.reason}\n`);
    process.stdout.write(`  Role: [${role.id}] ${role.company} — ${role.title}\n`);
    process.stdout.write('\n');
  }
} catch (err) {
  process.stderr.write(`Error: ${(err as Error).message}\n`);
  db.close();
  process.exit(1);
}

db.close();
