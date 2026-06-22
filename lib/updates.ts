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
import { UpdateArgs } from './args/update-args';
import { db } from './db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireRole(sqlite: Database.Database, id: number): RoleRow {
  const role = db.roles.getById(sqlite, id);

  if (!role) {
    throw new Error(`No role found with ID ${id}.`);
  }

  return role;
}

// ─── Syntactic validation (shape of input) ────────────────────────────────────

export function validateUpdateFlags(flags: UpdateArgs): void {
  const errors: string[] = [];

  if (!flags.id || flags.id.trim() === '') {
    errors.push('--id is required.');
  }

  if (!flags.status || flags.status.trim() === '') {
    errors.push('--status is required.');
  } else if (!VALID_STATUSES.includes(flags.status.trim() as RoleStatus)) {
    errors.push(`Invalid status: "${flags.status}". Valid values: ${VALID_STATUSES.join(', ')}.`);
  }

  for (const reason of flags.reasons) {
    if (!VALID_SKIP_REASONS.includes(reason.trim() as SkipReasonType)) {
      errors.push(
        `Invalid skip reason: "${reason}". Valid values: ${VALID_SKIP_REASONS.join(', ')}.`
      );
    }
  }

  for (const reason of flags.termination) {
    if (!VALID_TERMINATION_REASONS.includes(reason.trim() as TerminationReasonType)) {
      errors.push(
        `Invalid termination reason: "${reason}". Valid values: ${VALID_TERMINATION_REASONS.join(', ')}.`
      );
    }
  }

  if (flags.status?.trim() === 'Skipped' && flags.reasons.length === 0) {
    errors.push('--reasons is required when status is Skipped.');
  }

  if (flags.status?.trim() === 'Closed' && flags.termination.length === 0) {
    errors.push('--termination is required when status is Closed.');
  }

  if (errors.length > 0) {
    const errorList = errors.map((e) => `  - ${e}`).join('\n');
    throw new Error(`Validation failed:\n${errorList}`);
  }
}

// ─── updateRole ───────────────────────────────────────────────────────────────

export function updateRole(sqlite: Database.Database, flags: UpdateArgs): RoleRow {
  validateUpdateFlags(flags);

  const roleId = Number(flags.id);
  const role = requireRole(sqlite, roleId);

  const run = sqlite.transaction(() => {
    db.roles.updateStatus(sqlite, roleId, flags.status!.trim());

    for (const reason of flags.reasons) {
      db.skipReasons.insert(sqlite, roleId, reason.trim(), flags.note ?? null);
    }

    for (const reason of flags.termination) {
      db.terminationReasons.insert(sqlite, roleId, reason.trim(), flags.note ?? null);
    }
  });

  run();
  return role;
}
