// scripts/list-roles.ts
// Career Assistant — List Roles (JSON output)
//
// Usage:
//   npx ts-node scripts/list-roles.ts
//   npx ts-node scripts/list-roles.ts --status Applied
//   npx ts-node scripts/list-roles.ts --company Akamai
//   npx ts-node scripts/list-roles.ts --status Skipped > skipped.json

import Database      from 'better-sqlite3';
import path          from 'path';
import { parseArgs } from '../lib/args/list-args';
import { RoleRow, SkipReasonType, TerminationReasonType } from '../lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkipReasonRow {
  id:      number;
  role_id: number;
  reason:  SkipReasonType;
  note:    string | null;
}

interface TerminationReasonRow {
  id:      number;
  role_id: number;
  reason:  TerminationReasonType;
  note:    string | null;
}

interface RoleOutput extends RoleRow {
  skip_reasons:        SkipReasonRow[];
  termination_reasons: TerminationReasonRow[];
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const db    = new Database(path.join(__dirname, '../db/jobsearch.sqlite'), { readonly: true });
const flags = parseArgs(process.argv.slice(2));

// ─── Build query ──────────────────────────────────────────────────────────────

let query = `
  SELECT r.id, r.company, r.title, r.url, r.role_status, r.candidacy, r.applied_date, r.salary_min, r.salary_max, r.notes, r.created_at, r.updated_at
  FROM roles r
  WHERE 1=1
`;

const params: string[] = [];

if (flags.status) {
  query += ` AND r.role_status = ?`;
  params.push(flags.status);
}

if (flags.company) {
  query += ` AND r.company LIKE ?`;
  params.push(`%${flags.company}%`);
}

query += ` ORDER BY r.applied_date DESC, r.company ASC`;

// ─── Execute ──────────────────────────────────────────────────────────────────

const roles = db.prepare(query).all(...params) as RoleRow[];

if (roles.length === 0) {
  process.stderr.write('No roles found.\n');
  db.close();
  process.exit(0);
}

// ─── Fetch related records ────────────────────────────────────────────────────

const fetchSkipReasons = db.prepare(`
  SELECT id, role_id, reason, note
  FROM skip_reasons
  WHERE role_id = ?
  ORDER BY id ASC
`);

const fetchTerminationReasons = db.prepare(`
  SELECT id, role_id, reason, note
  FROM termination_reasons
  WHERE role_id = ?
  ORDER BY id ASC
`);

// ─── Assemble output ──────────────────────────────────────────────────────────

const output: RoleOutput[] = roles.map(role => {
  const skipReasons        = fetchSkipReasons.all(role.id)        as SkipReasonRow[];
  const terminationReasons = fetchTerminationReasons.all(role.id) as TerminationReasonRow[];

  return {
    ...role,
    skip_reasons:        skipReasons,
    termination_reasons: terminationReasons,
  };
});

process.stdout.write(JSON.stringify(output, null, 2) + '\n');

db.close();