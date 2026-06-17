// scripts/delete-role.ts
// Career Assistant — Delete Role
//
// Usage:
//   npx ts-node scripts/delete-role.ts --id <id> --mode preview
//   npx ts-node scripts/delete-role.ts --id <id>
//   npx ts-node scripts/delete-role.ts --id <id> --force

import Database from 'better-sqlite3';
import path from 'path';
import { previewRoleDeletion, deleteRole } from '../lib/deletes';

// ─── Parse args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags: Record<string, string> = {};

for (let i = 0; i < args.length; i += 2) {
  flags[args[i].replace('--', '')] = args[i + 1];
}

const isPreview = flags.mode === 'preview';
const isForce = 'force' in flags;

// ─── Validate args ────────────────────────────────────────────────────────────

if (!flags.id || flags.id.trim() === '') {
  process.stderr.write('Error: --id is required.\n');
  process.exit(1);
}

const id = parseInt(flags.id, 10);

if (isNaN(id)) {
  process.stderr.write('Error: --id must be a number.\n');
  process.exit(1);
}

// ─── Open DB ──────────────────────────────────────────────────────────────────

const db = new Database(path.join(__dirname, '../db/career-assistant.sqlite'));

// ─── Execute ──────────────────────────────────────────────────────────────────

try {
  if (isPreview) {
    const { role, skip_reasons, termination_reasons, job_descriptions } = previewRoleDeletion(
      db,
      id
    );

    process.stdout.write(`\nPreview — Role ${id}\n`);
    process.stdout.write(`  Company:     ${role.company}\n`);
    process.stdout.write(`  Title:       ${role.title}\n`);
    process.stdout.write(`  Status:      ${role.role_status}\n`);
    process.stdout.write(`\nDependent records:\n`);
    process.stdout.write(`  Skip reasons:        ${skip_reasons.length}\n`);
    process.stdout.write(`  Termination reasons: ${termination_reasons.length}\n`);
    process.stdout.write(`  Job descriptions:    ${job_descriptions.length}\n`);

    if (skip_reasons.length > 0) {
      process.stdout.write(`\n  Skip reasons:\n`);
      for (const sr of skip_reasons) {
        process.stdout.write(`    [${sr.id}] ${sr.reason}${sr.note ? ` — ${sr.note}` : ''}\n`);
      }
    }

    if (termination_reasons.length > 0) {
      process.stdout.write(`\n  Termination reasons:\n`);
      for (const tr of termination_reasons) {
        process.stdout.write(`    [${tr.id}] ${tr.reason}${tr.note ? ` — ${tr.note}` : ''}\n`);
      }
    }

    if (job_descriptions.length > 0) {
      process.stdout.write(`\n  Job descriptions:\n`);
      for (const jd of job_descriptions) {
        const preview = jd.content.slice(0, 80).replace(/\n/g, ' ');
        process.stdout.write(`    [${jd.id}] ${preview}${jd.content.length > 80 ? '...' : ''}\n`);
      }
    }

    process.stdout.write('\n');
  } else {
    const { role, skip_reasons, termination_reasons, job_descriptions } = deleteRole(
      db,
      id,
      isForce
    );

    process.stdout.write(`\n✓ Deleted: ${role.company} — ${role.title}\n`);

    if (isForce) {
      process.stdout.write(`  Also deleted:\n`);
      process.stdout.write(`    Skip reasons:        ${skip_reasons.length}\n`);
      process.stdout.write(`    Termination reasons: ${termination_reasons.length}\n`);
      process.stdout.write(`    Job descriptions:    ${job_descriptions.length}\n`);
    }

    process.stdout.write('\n');
  }
} catch (err) {
  process.stderr.write(`Error: ${(err as Error).message}\n`);
  db.close();
  process.exit(1);
}

db.close();
