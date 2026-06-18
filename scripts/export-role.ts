// scripts/export-role.ts
// Career Assistant — Export Role
// Exports a single role in the specified format to stdout.
//
// Usage:
//   npx ts-node scripts/export-role.ts --id <id> --format simple
//   npx ts-node scripts/export-role.ts --id <id> --format rich

import Database from 'better-sqlite3';
import path from 'path';
import { exportRole, ExportFormat } from '../lib/exporters';
import { RoleRow } from '../lib/types';

// ─── Parse args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags: Record<string, string> = {};

for (let i = 0; i < args.length; i += 2) {
  flags[args[i].replace('--', '')] = args[i + 1];
}

// ─── Validate args ────────────────────────────────────────────────────────────

if (!flags.id || flags.id.trim() === '') {
  process.stderr.write('Error: --id is required.\n');
  process.exit(1);
}

if (!flags.format || flags.format.trim() === '') {
  process.stderr.write('Error: --format is required. Valid values: simple, rich.\n');
  process.exit(1);
}

const VALID_FORMATS: ExportFormat[] = ['simple', 'rich'];

if (!VALID_FORMATS.includes(flags.format as ExportFormat)) {
  process.stderr.write(
    `Error: Invalid format "${flags.format}". Valid values: ${VALID_FORMATS.join(', ')}.\n`
  );
  process.exit(1);
}

// ─── Open DB ──────────────────────────────────────────────────────────────────

const db = new Database(path.join(__dirname, '../db/career-assistant.sqlite'), { readonly: true });

// ─── Fetch role and JD ────────────────────────────────────────────────────────

const row = db
  .prepare(
    `
  SELECT r.id, r.company, r.title, r.url, r.role_status, r.candidacy, r.applied_date, r.salary_min, r.salary_max, r.notes, r.created_at, r.updated_at, jd.content AS jd
  FROM roles r
  LEFT JOIN job_descriptions jd ON jd.role_id = r.id
  WHERE r.id = ?
`
  )
  .get(flags.id) as RoleRow | undefined;

if (!row) {
  process.stderr.write(`Error: No role found with ID ${flags.id}.\n`);
  db.close();
  process.exit(1);
}

// ─── Export ───────────────────────────────────────────────────────────────────

const output = exportRole(row, flags.format as ExportFormat);
process.stdout.write(output + '\n');

db.close();
