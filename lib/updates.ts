// lib/updates.ts
// Career Assistant — Role update operations
// Owns all update-related logic: validation, role fetching, and DB writes.
// Callers are responsible for opening and closing the DB connection.

import Database from 'better-sqlite3';
import {
  RoleRow,
  RoleStatus,
  SkipReasonType,
  TerminationReasonType,
  VALID_STATUSES,
  VALID_SKIP_REASONS,
  VALID_TERMINATION_REASONS,
} from './types';
import { db } from './db';

// ─── UpdateRoleInput ──────────────────────────────────────────────────────────

export interface UpdateRoleInput {
  id: number;
  status: string;
  reasons: string[];
  termination: string[];
  note?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireRole(sqlite: Database.Database, id: number): RoleRow {
  const role = db.roles.getById(sqlite, id);

  if (!role) {
    throw new Error(`No role found with ID ${id}.`);
  }

  return role;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateUpdateFlags(input: UpdateRoleInput): void {
  const errors: string[] = [];

  if (!input.status || input.status.trim() === '') {
    errors.push('status is required.');
  } else if (!VALID_STATUSES.includes(input.status.trim() as RoleStatus)) {
    errors.push(`Invalid status: "${input.status}". Valid values: ${VALID_STATUSES.join(', ')}.`);
  }

  for (const reason of input.reasons) {
    if (!VALID_SKIP_REASONS.includes(reason.trim() as SkipReasonType)) {
      errors.push(
        `Invalid skip reason: "${reason}". Valid values: ${VALID_SKIP_REASONS.join(', ')}.`
      );
    }
  }

  for (const reason of input.termination) {
    if (!VALID_TERMINATION_REASONS.includes(reason.trim() as TerminationReasonType)) {
      errors.push(
        `Invalid termination reason: "${reason}". Valid values: ${VALID_TERMINATION_REASONS.join(', ')}.`
      );
    }
  }

  if (input.status?.trim() === 'Skipped' && input.reasons.length === 0) {
    errors.push('reasons is required when status is Skipped.');
  }

  if (input.status?.trim() === 'Closed' && input.termination.length === 0) {
    errors.push('termination is required when status is Closed.');
  }

  if (errors.length > 0) {
    const errorList = errors.map((e) => `  - ${e}`).join('\n');
    throw new Error(`Validation failed:\n${errorList}`);
  }
}

// ─── updateRole ───────────────────────────────────────────────────────────────

export function updateRole(sqlite: Database.Database, input: UpdateRoleInput): RoleRow {
  validateUpdateFlags(input);
  requireRole(sqlite, input.id);

  const run = sqlite.transaction(() => {
    db.roles.updateStatus(sqlite, input.id, input.status.trim());

    for (const reason of input.reasons) {
      db.skipReasons.insert(sqlite, input.id, reason.trim(), input.note ?? null);
    }

    for (const reason of input.termination) {
      db.terminationReasons.insert(sqlite, input.id, reason.trim(), input.note ?? null);
    }
  });

  run();
  return db.roles.getById(sqlite, input.id)!;
}
