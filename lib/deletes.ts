// lib/deletes.ts
// Career Assistant — Delete operations
// Owns all delete-related logic: preview, normal, and force deletion.
// Callers are responsible for opening and closing the DB connection.

import Database from 'better-sqlite3';
import { RoleRow } from './types';
import { getRoleById, deleteRoleById } from './db/roles.db';
import {
  SkipReasonRow,
  getSkipReasonById,
  getSkipReasonsByRoleId,
  deleteSkipReasonById,
  deleteSkipReasonsByRoleId,
} from './db/skip-reasons.db';
import {
  TerminationReasonRow,
  getTerminationReasonById,
  getTerminationReasonsByRoleId,
  deleteTerminationReasonById,
  deleteTerminationReasonsByRoleId,
} from './db/termination-reasons.db';
import {
  JobDescriptionRow,
  getJobDescriptionByRoleId,
  deleteJobDescriptionByRoleId,
} from './db/job-descriptions.db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { SkipReasonRow, TerminationReasonRow, JobDescriptionRow };

export interface RoleDependents {
  role: RoleRow;
  skip_reasons: SkipReasonRow[];
  termination_reasons: TerminationReasonRow[];
  job_descriptions: JobDescriptionRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoleOrThrow(db: Database.Database, id: number): RoleRow {
  const role = getRoleById(db, id);

  if (!role) {
    throw new Error(`No role found with ID ${id}.`);
  }

  return role;
}

function fetchDependents(db: Database.Database, roleId: number): Omit<RoleDependents, 'role'> {
  const skip_reasons = getSkipReasonsByRoleId(db, roleId);
  const termination_reasons = getTerminationReasonsByRoleId(db, roleId);

  // job_descriptions is modelled as an array here for interface consistency with RoleDependents,
  // even though the schema enforces a one-to-one relationship between roles and job_descriptions.
  // The singular/array inconsistency is tracked separately and not addressed in this refactor.
  const jd = getJobDescriptionByRoleId(db, roleId);
  const job_descriptions: JobDescriptionRow[] = jd ? [jd] : [];

  return { skip_reasons, termination_reasons, job_descriptions };
}

// ─── Role deletion ────────────────────────────────────────────────────────────

export function previewRoleDeletion(db: Database.Database, id: number): RoleDependents {
  const role = getRoleOrThrow(db, id);
  const dependents = fetchDependents(db, id);

  return { role, ...dependents };
}

export function deleteRole(
  db: Database.Database,
  id: number,
  force: boolean = false
): RoleDependents {
  const role = getRoleOrThrow(db, id);
  const dependents = fetchDependents(db, id);

  const hasDependents =
    dependents.skip_reasons.length > 0 || dependents.termination_reasons.length > 0;

  if (hasDependents && !force) {
    throw new Error(
      `Role ${id} has dependent records and cannot be deleted without --force.\n` +
        `  Skip reasons: ${dependents.skip_reasons.length}\n` +
        `  Termination reasons: ${dependents.termination_reasons.length}\n`
    );
  }

  const run = db.transaction(() => {
    if (force) {
      deleteSkipReasonsByRoleId(db, id);
      deleteTerminationReasonsByRoleId(db, id);
    }
    deleteJobDescriptionByRoleId(db, id);
    deleteRoleById(db, id);
  });

  run();

  return { role, ...dependents };
}

// ─── Skip reason deletion ─────────────────────────────────────────────────────

export function previewSkipReasonDeletion(
  db: Database.Database,
  id: number
): { reason: SkipReasonRow; role: RoleRow } {
  const reason = getSkipReasonById(db, id);

  if (!reason) {
    throw new Error(`No skip reason found with ID ${id}.`);
  }

  const role = getRoleOrThrow(db, reason.role_id);

  return { reason, role };
}

export function deleteSkipReason(
  db: Database.Database,
  id: number
): { reason: SkipReasonRow; role: RoleRow } {
  const { reason, role } = previewSkipReasonDeletion(db, id);
  deleteSkipReasonById(db, id);
  return { reason, role };
}

// ─── Termination reason deletion ──────────────────────────────────────────────

export function previewTerminationReasonDeletion(
  db: Database.Database,
  id: number
): { reason: TerminationReasonRow; role: RoleRow } {
  const reason = getTerminationReasonById(db, id);

  if (!reason) {
    throw new Error(`No termination reason found with ID ${id}.`);
  }

  const role = getRoleOrThrow(db, reason.role_id);

  return { reason, role };
}

export function deleteTerminationReason(
  db: Database.Database,
  id: number
): { reason: TerminationReasonRow; role: RoleRow } {
  const { reason, role } = previewTerminationReasonDeletion(db, id);
  deleteTerminationReasonById(db, id);
  return { reason, role };
}

// ─── Job description deletion ─────────────────────────────────────────────────

export function previewJobDescriptionDeletion(
  db: Database.Database,
  roleId: number
): { jd: JobDescriptionRow; role: RoleRow } {
  const jd = getJobDescriptionByRoleId(db, roleId);

  if (!jd) {
    throw new Error(`No job description found for role ID ${roleId}.`);
  }

  const role = getRoleOrThrow(db, roleId);

  return { jd, role };
}

export function deleteJobDescription(
  db: Database.Database,
  roleId: number
): { jd: JobDescriptionRow; role: RoleRow } {
  const { jd, role } = previewJobDescriptionDeletion(db, roleId);
  deleteJobDescriptionByRoleId(db, roleId);
  return { jd, role };
}
