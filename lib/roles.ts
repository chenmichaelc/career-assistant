// lib/roles.ts
// Career Assistant — Role operations

import Database from 'better-sqlite3';
import { RoleInput } from './types';
import { db } from './db';

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

// ─── addRole ──────────────────────────────────────────────────────────────────

export function addRole(sqlite: Database.Database, role: RoleInput): number {
  const errors = validate(role);

  if (errors.length > 0) {
    const errorList = errors.map((e) => `  - ${e}`).join('\n');
    throw new Error(`Validation failed:\n${errorList}`);
  }

  let roleId: number;

  const run = sqlite.transaction(() => {
    roleId = db.roles.insertRole(sqlite, {
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

    db.jobDescriptions.insert(sqlite, roleId!, role.jd);

    if (role.skip_reasons != null) {
      for (const sr of role.skip_reasons) {
        db.skipReasons.insert(sqlite, roleId!, sr.reason, sr.note ?? null);
      }
    }

    if (role.termination_reasons != null) {
      for (const tr of role.termination_reasons) {
        db.terminationReasons.insert(sqlite, roleId!, tr.reason, tr.note ?? null);
      }
    }
  });

  run();
  return roleId!;
}
