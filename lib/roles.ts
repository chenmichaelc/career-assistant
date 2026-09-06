// lib/roles.ts
// Career Assistant — Role operations

import Database from 'better-sqlite3';
import { RoleInput } from './types';
import { db } from './db';
import { cleanseUrl, InvalidUrlError } from './url-cleanse';

// ─── Validation ───────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: (keyof RoleInput)[] = ['company', 'title', 'url', 'role_status', 'jd'];

interface ContextualRule {
  condition: (role: RoleInput) => boolean;
  message: string;
}

const CONTEXTUAL_RULES: ContextualRule[] = [
  {
    condition: (role) => role.role_status === 'Applied' && !role.applied_date,
    message: 'applied_date is required when role_status is Applied.',
  },
  {
    condition: (role) =>
      role.role_status === 'Skipped' &&
      (role.skip_reasons == null || role.skip_reasons.length === 0),
    message: 'skip_reasons is required when role_status is Skipped.',
  },
  {
    condition: (role) =>
      role.role_status === 'Closed' &&
      (role.termination_reasons == null || role.termination_reasons.length === 0),
    message: 'termination_reasons is required when role_status is Closed.',
  },
];

function validate(role: RoleInput): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = role[field];
    const isMissing = value === null || value === undefined || String(value).trim() === '';
    if (isMissing) {
      errors.push(`${field} is required.`);
    }
  }

  for (const rule of CONTEXTUAL_RULES) {
    if (rule.condition(role)) {
      errors.push(rule.message);
    }
  }

  return errors;
}

// ─── addRole steps ──────────────────────────────────────────────────────────────

function insertRoleRow(sqlite: Database.Database, role: RoleInput): number {
  return db.roles.insertRole(sqlite, {
    company: role.company,
    title: role.title,
    url: role.url,
    role_status: role.role_status,
    candidacy: role.candidacy ?? null,
    applied_date: role.applied_date ?? null,
    salary_min: role.salary_min ?? null,
    salary_max: role.salary_max ?? null,
    notes: role.notes ?? null,
  });
}

function retireMatchingStub(sqlite: Database.Database, url: string): void {
  let cleansed: string | null = null;
  try {
    cleansed = cleanseUrl(url);
  } catch (err) {
    if (!(err instanceof InvalidUrlError)) throw err;
  }
  if (cleansed == null) return;

  const stub = db.jobStubs.getByUrl(sqlite, cleansed);
  if (stub != null) {
    db.jobStubs.deleteById(sqlite, stub.id);
  }
}

// ─── addRole ──────────────────────────────────────────────────────────────────

export function addRole(sqlite: Database.Database, role: RoleInput): number {
  const errors = validate(role);

  if (errors.length > 0) {
    const errorList = errors.map((e) => `  - ${e}`).join('\n');
    throw new Error(`Validation failed:\n${errorList}`);
  }

  let roleId: number;

  const run = sqlite.transaction(() => {
    roleId = insertRoleRow(sqlite, role);
    db.jobDescriptions.insert(sqlite, roleId, role.jd);
    db.skipReasons.insertMany(
      sqlite,
      roleId,
      (role.skip_reasons ?? []).map((sr) => ({ reason: sr.reason, note: sr.note ?? null }))
    );
    db.terminationReasons.insertMany(
      sqlite,
      roleId,
      (role.termination_reasons ?? []).map((tr) => ({ reason: tr.reason, note: tr.note ?? null }))
    );
    retireMatchingStub(sqlite, role.url);
  });

  run();
  return roleId!;
}
