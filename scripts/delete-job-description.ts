// scripts/delete-job-description.ts
// Career Assistant — Delete Job Description
//
// Usage:
//   npx ts-node scripts/delete-job-description.ts --role-id <id> --mode preview
//   npx ts-node scripts/delete-job-description.ts --role-id <id>

import Database from 'better-sqlite3';
import path from 'path';
import { previewJobDescriptionDeletion, deleteJobDescription } from '../lib/deletes';

const args = process.argv.slice(2);
const flags: Record<string, string> = {};

for (let i = 0; i < args.length; i += 2) {
  flags[args[i].replace('--', '')] = args[i + 1];
}

const isPreview = flags.mode === 'preview';

if (!flags['role-id'] || flags['role-id'].trim() === '') {
  process.stderr.write('Error: --role-id is required.\n');
  process.exit(1);
}

const roleId = parseInt(flags['role-id'], 10);

if (isNaN(roleId)) {
  process.stderr.write('Error: --role-id must be a number.\n');
  process.exit(1);
}

const db = new Database(path.join(__dirname, '../db/career-assistant.sqlite'));

try {
  if (isPreview) {
    const { jd, role } = previewJobDescriptionDeletion(db, roleId);

    process.stdout.write(`\nPreview — Job Description for Role ${roleId}\n`);
    process.stdout.write(`  Role:    [${role.id}] ${role.company} — ${role.title}\n`);
    process.stdout.write(`  JD ID:   ${jd.id}\n`);

    const preview = jd.content.slice(0, 120).replace(/\n/g, ' ');
    process.stdout.write(`  Content: ${preview}${jd.content.length > 120 ? '...' : ''}\n`);
    process.stdout.write('\n');
  } else {
    const { jd, role } = deleteJobDescription(db, roleId);

    process.stdout.write(`\n✓ Deleted job description [${jd.id}] for role ${roleId}\n`);
    process.stdout.write(`  Role: [${role.id}] ${role.company} — ${role.title}\n`);
    process.stdout.write('\n');
  }
} catch (err) {
  process.stderr.write(`Error: ${(err as Error).message}\n`);
  db.close();
  process.exit(1);
}

db.close();
