// scripts/list-roles.ts
// Career Assistant — List Roles (CSV output)
//
// Usage:
//   ts-node scripts/list-roles.ts
//   ts-node scripts/list-roles.ts --status Applied
//   ts-node scripts/list-roles.ts --company Akamai
//   ts-node scripts/list-roles.ts --status Skipped > skipped.csv

import Database        from 'better-sqlite3';
import path            from 'path';
import { parseArgs }   from '../lib/args/list-args';
import { RoleRow }     from '../lib/types';

const db    = new Database(path.join(__dirname, '../db/jobsearch.sqlite'), { readonly: true });
const flags = parseArgs(process.argv.slice(2));

let query = `
  SELECT id, company, title, role_status, candidacy, applied_date, salary_min, salary_max, notes
  FROM roles
  WHERE 1=1
`;

const params: string[] = [];

if (flags.status) {
  query += ` AND role_status = ?`;
  params.push(flags.status);
}

if (flags.company) {
  query += ` AND company LIKE ?`;
  params.push(`%${flags.company}%`);
}

query += ` ORDER BY applied_date DESC, company ASC`;

const statement = db.prepare(query);
const roles     = statement.all(...params) as RoleRow[];

if (roles.length === 0) {
  process.stderr.write('No roles found.\n');
  db.close();
  process.exit(0);
}

function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) {
    return '';
  }

  const str          = String(val);
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n');

  if (needsQuoting) {
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

const headers: (keyof RoleRow)[] = ['id', 'company', 'title', 'role_status', 'candidacy', 'applied_date', 'salary_min', 'salary_max', 'notes'];

process.stdout.write(headers.join(',') + '\n');

for (const role of roles) {
  const row = headers.map(header => escapeCSV(role[header] as string | number | null));
  process.stdout.write(row.join(',') + '\n');
}

db.close();
