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

// ─── Role existence check ─────────────────────────────────────────────────────

export function fetchRoleOrThrow(db: Database.Database, id: string): RoleRow {
  const role = db
    .prepare(
      `
    SELECT id, company, title, role_status, candidacy, applied_date,
           salary_min, salary_max, notes, created_at, updated_at
    FROM roles
    WHERE id = ?
  `
    )
    .get(id) as RoleRow | undefined;

  if (!role) {
    throw new Error(`No role found with ID ${id}.`);
  }

  return role;
}

// ─── updateRole ───────────────────────────────────────────────────────────────

export function updateRole(db: Database.Database, flags: UpdateArgs): RoleRow {
  validateUpdateFlags(flags);

  const role = fetchRoleOrThrow(db, flags.id!);

  const updateRoleStatus = db.prepare(`
    UPDATE roles
    SET role_status = @role_status,
        applied_date = CASE
            WHEN @role_status = 'Applied' AND applied_date IS NULL
            THEN date('now')
            ELSE applied_date
            END,
        updated_at  = datetime('now')
    WHERE id = @id
  `);

  const insertSkipReason = db.prepare(`
    INSERT INTO skip_reasons (role_id, reason, note)
    VALUES (@role_id, @reason, @note)
  `);

  const insertTerminationReason = db.prepare(`
    INSERT INTO termination_reasons (role_id, reason, note)
    VALUES (@role_id, @reason, @note)
  `);

  const run = db.transaction(() => {
    updateRoleStatus.run({
      role_status: flags.status!.trim(),
      id: flags.id,
    });

    for (const reason of flags.reasons) {
      insertSkipReason.run({
        role_id: flags.id,
        reason: reason.trim(),
        note: flags.note ?? null,
      });
    }

    for (const reason of flags.termination) {
      insertTerminationReason.run({
        role_id: flags.id,
        reason: reason.trim(),
        note: flags.note ?? null,
      });
    }
  });

  run();
  return role;
}
