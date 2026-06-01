// lib/deletes.ts
// Career Assistant — Delete operations
// Owns all delete-related logic: preview, normal, and force deletion.
// Callers are responsible for opening and closing the DB connection.

import Database from 'better-sqlite3';
import { RoleRow, SkipReasonType, TerminationReasonType } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkipReasonRow {
  id:      number;
  role_id: number;
  reason:  SkipReasonType;
  note:    string | null;
}

export interface TerminationReasonRow {
  id:      number;
  role_id: number;
  reason:  TerminationReasonType;
  note:    string | null;
}

export interface JobDescriptionRow {
  id:      number;
  role_id: number;
  content: string;
}

export interface RoleDependents {
  role:                RoleRow;
  skip_reasons:        SkipReasonRow[];
  termination_reasons: TerminationReasonRow[];
  job_descriptions:    JobDescriptionRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fetchRole(db: Database.Database, id: number): RoleRow | undefined {
  return db.prepare(`
    SELECT id, company, title, url, role_status, candidacy, applied_date,
           salary_min, salary_max, notes, created_at, updated_at
    FROM roles
    WHERE id = ?
  `).get(id) as RoleRow | undefined;
}

function fetchDependents(db: Database.Database, roleId: number): Omit<RoleDependents, 'role'> {
  const skip_reasons = db.prepare(`
    SELECT id, role_id, reason, note
    FROM skip_reasons
    WHERE role_id = ?
    ORDER BY id ASC
  `).all(roleId) as SkipReasonRow[];

  const termination_reasons = db.prepare(`
    SELECT id, role_id, reason, note
    FROM termination_reasons
    WHERE role_id = ?
    ORDER BY id ASC
  `).all(roleId) as TerminationReasonRow[];

  const job_descriptions = db.prepare(`
    SELECT id, role_id, content
    FROM job_descriptions
    WHERE role_id = ?
    ORDER BY id ASC
  `).all(roleId) as JobDescriptionRow[];

  return { skip_reasons, termination_reasons, job_descriptions };
}

// ─── Role deletion ────────────────────────────────────────────────────────────

export function previewRoleDeletion(db: Database.Database, id: number): RoleDependents {
  const role = fetchRole(db, id);

  if (!role) {
    throw new Error(`No role found with ID ${id}.`);
  }

  const dependents = fetchDependents(db, id);

  return { role, ...dependents };
}

export function deleteRole(db: Database.Database, id: number, force: boolean = false): RoleDependents {
  const role = fetchRole(db, id);

  if (!role) {
    throw new Error(`No role found with ID ${id}.`);
  }

  const dependents = fetchDependents(db, id);
  const hasDependents =
    dependents.skip_reasons.length > 0 ||
    dependents.termination_reasons.length > 0 ||
    dependents.job_descriptions.length > 0;

  if (hasDependents && !force) {
    throw new Error(
      `Role ${id} has dependent records and cannot be deleted without --force.\n` +
      `  Skip reasons: ${dependents.skip_reasons.length}\n` +
      `  Termination reasons: ${dependents.termination_reasons.length}\n` +
      `  Job descriptions: ${dependents.job_descriptions.length}`
    );
  }

  const run = db.transaction(() => {
    if (force) {
      db.prepare(`DELETE FROM skip_reasons WHERE role_id = ?`).run(id);
      db.prepare(`DELETE FROM termination_reasons WHERE role_id = ?`).run(id);
      db.prepare(`DELETE FROM job_descriptions WHERE role_id = ?`).run(id);
    }
    db.prepare(`DELETE FROM roles WHERE id = ?`).run(id);
  });

  run();

  return { role, ...dependents };
}

// ─── Skip reason deletion ─────────────────────────────────────────────────────

export function previewSkipReasonDeletion(db: Database.Database, id: number): { reason: SkipReasonRow; role: RoleRow } {
  const reason = db.prepare(`
    SELECT id, role_id, reason, note
    FROM skip_reasons
    WHERE id = ?
  `).get(id) as SkipReasonRow | undefined;

  if (!reason) {
    throw new Error(`No skip reason found with ID ${id}.`);
  }

  const role = fetchRole(db, reason.role_id);

  if (!role) {
    throw new Error(`No role found with ID ${reason.role_id}.`);
  }

  return { reason, role };
}

export function deleteSkipReason(db: Database.Database, id: number): { reason: SkipReasonRow; role: RoleRow } {
  const { reason, role } = previewSkipReasonDeletion(db, id);
  db.prepare(`DELETE FROM skip_reasons WHERE id = ?`).run(id);
  return { reason, role };
}

// ─── Termination reason deletion ──────────────────────────────────────────────

export function previewTerminationReasonDeletion(db: Database.Database, id: number): { reason: TerminationReasonRow; role: RoleRow } {
  const reason = db.prepare(`
    SELECT id, role_id, reason, note
    FROM termination_reasons
    WHERE id = ?
  `).get(id) as TerminationReasonRow | undefined;

  if (!reason) {
    throw new Error(`No termination reason found with ID ${id}.`);
  }

  const role = fetchRole(db, reason.role_id);

  if (!role) {
    throw new Error(`No role found with ID ${reason.role_id}.`);
  }

  return { reason, role };
}

export function deleteTerminationReason(db: Database.Database, id: number): { reason: TerminationReasonRow; role: RoleRow } {
  const { reason, role } = previewTerminationReasonDeletion(db, id);
  db.prepare(`DELETE FROM termination_reasons WHERE id = ?`).run(id);
  return { reason, role };
}

// ─── Job description deletion ─────────────────────────────────────────────────

export function previewJobDescriptionDeletion(db: Database.Database, roleId: number): { jd: JobDescriptionRow; role: RoleRow } {
  const jd = db.prepare(`
    SELECT id, role_id, content
    FROM job_descriptions
    WHERE role_id = ?
  `).get(roleId) as JobDescriptionRow | undefined;

  if (!jd) {
    throw new Error(`No job description found for role ID ${roleId}.`);
  }

  const role = fetchRole(db, roleId);

  if (!role) {
    throw new Error(`No role found with ID ${roleId}.`);
  }

  return { jd, role };
}

export function deleteJobDescription(db: Database.Database, roleId: number): { jd: JobDescriptionRow; role: RoleRow } {
  const { jd, role } = previewJobDescriptionDeletion(db, roleId);
  db.prepare(`DELETE FROM job_descriptions WHERE role_id = ?`).run(roleId);
  return { jd, role };
}
