// lib/deletes.ts
// Career Assistant — Delete operations
// Owns all delete-related logic: preview, normal, and force deletion.
// Callers are responsible for opening and closing the DB connection.

import Database from 'better-sqlite3';
import { RoleRow } from './types';
import { db, SkipReasonRow, TerminationReasonRow, JobDescriptionRow } from './db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { SkipReasonRow, TerminationReasonRow, JobDescriptionRow };

export interface RoleDependents {
  role: RoleRow;
  skip_reasons: SkipReasonRow[];
  termination_reasons: TerminationReasonRow[];
  job_descriptions: JobDescriptionRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireRole(sqlite: Database.Database, id: number): RoleRow {
  const role = db.roles.getById(sqlite, id);

  if (!role) {
    throw new Error(`No role found with ID ${id}.`);
  }

  return role;
}

function fetchDependents(sqlite: Database.Database, roleId: number): Omit<RoleDependents, 'role'> {
  const skip_reasons = db.skipReasons.getAllByRoleId(sqlite, roleId);
  const termination_reasons = db.terminationReasons.getAllByRoleId(sqlite, roleId);

  // job_descriptions is modelled as an array here for interface consistency with RoleDependents,
  // even though the schema enforces a one-to-one relationship between roles and job_descriptions.
  // The singular/array inconsistency is tracked separately and not addressed in this refactor.
  const jd = db.jobDescriptions.getByRoleId(sqlite, roleId);
  const job_descriptions: JobDescriptionRow[] = jd ? [jd] : [];

  return { skip_reasons, termination_reasons, job_descriptions };
}

// ─── Role deletion ────────────────────────────────────────────────────────────

export function previewRoleDeletion(sqlite: Database.Database, id: number): RoleDependents {
  const role = requireRole(sqlite, id);
  const dependents = fetchDependents(sqlite, id);

  return { role, ...dependents };
}

export function deleteRole(
  sqlite: Database.Database,
  id: number,
  force: boolean = false
): RoleDependents {
  const role = requireRole(sqlite, id);
  const dependents = fetchDependents(sqlite, id);

  const hasDependents =
    dependents.skip_reasons.length > 0 || dependents.termination_reasons.length > 0;

  if (hasDependents && !force) {
    throw new Error(
      `Role ${id} has dependent records and cannot be deleted without --force.\n` +
        `  Skip reasons: ${dependents.skip_reasons.length}\n` +
        `  Termination reasons: ${dependents.termination_reasons.length}\n`
    );
  }

  const run = sqlite.transaction(() => {
    if (force) {
      db.skipReasons.deleteAllByRoleId(sqlite, id);
      db.terminationReasons.deleteAllByRoleId(sqlite, id);
    }
    db.jobDescriptions.deleteByRoleId(sqlite, id);
    db.roles.deleteById(sqlite, id);
  });

  run();

  return { role, ...dependents };
}

// ─── Skip reason deletion ─────────────────────────────────────────────────────

export function previewSkipReasonDeletion(
  sqlite: Database.Database,
  id: number
): { reason: SkipReasonRow; role: RoleRow } {
  const reason = db.skipReasons.getById(sqlite, id);

  if (!reason) {
    throw new Error(`No skip reason found with ID ${id}.`);
  }

  const role = requireRole(sqlite, reason.role_id);

  return { reason, role };
}

export function deleteSkipReason(
  sqlite: Database.Database,
  id: number
): { reason: SkipReasonRow; role: RoleRow } {
  const { reason, role } = previewSkipReasonDeletion(sqlite, id);
  db.skipReasons.deleteById(sqlite, id);
  return { reason, role };
}

// ─── Termination reason deletion ──────────────────────────────────────────────

export function previewTerminationReasonDeletion(
  sqlite: Database.Database,
  id: number
): { reason: TerminationReasonRow; role: RoleRow } {
  const reason = db.terminationReasons.getById(sqlite, id);

  if (!reason) {
    throw new Error(`No termination reason found with ID ${id}.`);
  }

  const role = requireRole(sqlite, reason.role_id);

  return { reason, role };
}

export function deleteTerminationReason(
  sqlite: Database.Database,
  id: number
): { reason: TerminationReasonRow; role: RoleRow } {
  const { reason, role } = previewTerminationReasonDeletion(sqlite, id);
  db.terminationReasons.deleteById(sqlite, id);
  return { reason, role };
}
