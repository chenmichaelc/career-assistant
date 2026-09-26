// lib/roles.ts
// Career Assistant — Role aggregate operations (create, update, delete)

import Database from 'better-sqlite3';
import {
  RoleInput,
  RoleRow,
  VALID_STATUSES,
  VALID_SKIP_REASONS,
  VALID_TERMINATION_REASONS,
  isRoleStatus,
  isSkipReasonType,
  isTerminationReasonType,
} from './types';
import { db, SkipReasonRow, TerminationReasonRow, JobDescriptionRow } from './db';
import { cleanseUrl, InvalidUrlError } from './url-cleanse';

// ─── Errors ───────────────────────────────────────────────────────────────────

export class RoleNotFoundError extends Error {
  constructor(roleId: number) {
    super(`No role found with ID ${roleId}.`);
    this.name = 'RoleNotFoundError';
  }
}

export class SkipReasonNotFoundError extends Error {
  constructor(id: number) {
    super(`No skip reason found with ID ${id}.`);
    this.name = 'SkipReasonNotFoundError';
  }
}

export class TerminationReasonNotFoundError extends Error {
  constructor(id: number) {
    super(`No termination reason found with ID ${id}.`);
    this.name = 'TerminationReasonNotFoundError';
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpdateRoleInput {
  id: number;
  status: string;
  reasons: string[];
  termination: string[];
  note?: string;
}

export type { SkipReasonRow, TerminationReasonRow, JobDescriptionRow };

export interface RoleDependents {
  role: RoleRow;
  skip_reasons: SkipReasonRow[];
  termination_reasons: TerminationReasonRow[];
  job_descriptions: JobDescriptionRow[];
}

// ─── Vocabulary checks ──────────────────────────────────────────────────────────

export function checkSkipReason(reason: string): string | null {
  if (!isSkipReasonType(reason.trim())) {
    return `Invalid skip reason: "${reason}". Valid values: ${VALID_SKIP_REASONS.join(', ')}.`;
  }
  return null;
}

export function checkTerminationReason(reason: string): string | null {
  if (!isTerminationReasonType(reason.trim())) {
    return `Invalid termination reason: "${reason}". Valid values: ${VALID_TERMINATION_REASONS.join(', ')}.`;
  }
  return null;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

// Returns the role row; throws a generic Error. Used by updateRole/deleteRole/previews.
function requireRole(sqlite: Database.Database, id: number): RoleRow {
  const role = db.roles.getById(sqlite, id);

  if (!role) {
    throw new Error(`No role found with ID ${id}.`);
  }

  return role;
}

function requireRoleExists(sqlite: Database.Database, roleId: number): void {
  if (!db.roles.getById(sqlite, roleId)) {
    throw new RoleNotFoundError(roleId);
  }
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

// ─── addRole validation ─────────────────────────────────────────────────────────

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

  for (const skipReason of role.skip_reasons ?? []) {
    const error = checkSkipReason(skipReason.reason);
    if (error) errors.push(error);
  }

  for (const terminationReason of role.termination_reasons ?? []) {
    const error = checkTerminationReason(terminationReason.reason);
    if (error) errors.push(error);
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

// eslint-disable-next-line max-lines-per-function -- already decomposed (insertRoleRow/retireMatchingStub); overage is multi-line map() formatting, not logic; see semantic-testing-rules.md's "max-lines-per-function false positive" section
export function addRole(sqlite: Database.Database, role: RoleInput): number {
  const errors = validate(role);

  if (errors.length > 0) {
    const errorList = errors.map((errorMessage) => `  - ${errorMessage}`).join('\n');
    throw new Error(`Validation failed:\n${errorList}`);
  }

  let roleId: number;

  const run = sqlite.transaction(() => {
    roleId = insertRoleRow(sqlite, role);
    db.jobDescriptions.insert(sqlite, roleId, role.jd);
    db.skipReasons.insertMany(
      sqlite,
      roleId,
      (role.skip_reasons ?? []).map((skipReason) => ({
        reason: skipReason.reason,
        note: skipReason.note ?? null,
      }))
    );
    db.terminationReasons.insertMany(
      sqlite,
      roleId,
      (role.termination_reasons ?? []).map((terminationReason) => ({
        reason: terminationReason.reason,
        note: terminationReason.note ?? null,
      }))
    );
    retireMatchingStub(sqlite, role.url);
  });

  run();
  return roleId!;
}

// ─── addSkipReason / addTerminationReason ──────────────────────────────────────

export function addSkipReason(
  sqlite: Database.Database,
  roleId: number,
  reason: string,
  note: string | null
): number {
  const error = checkSkipReason(reason);
  if (error) {
    throw new Error(error);
  }

  requireRoleExists(sqlite, roleId);

  return db.skipReasons.insert(sqlite, roleId, reason.trim(), note);
}

export function addTerminationReason(
  sqlite: Database.Database,
  roleId: number,
  reason: string,
  note: string | null
): number {
  const error = checkTerminationReason(reason);
  if (error) {
    throw new Error(error);
  }

  requireRoleExists(sqlite, roleId);

  return db.terminationReasons.insert(sqlite, roleId, reason.trim(), note);
}

// ─── updateRole validation ──────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function -- flat list of independent checks; see semantic-testing-rules.md's "max-lines-per-function false positive" section
export function validateUpdateInput(input: UpdateRoleInput): void {
  const errors: string[] = [];

  if (!Number.isFinite(input.id) || input.id <= 0) {
    errors.push('id must be a positive integer.');
  }

  if (!input.status || input.status.trim() === '') {
    errors.push('status is required.');
  } else if (!isRoleStatus(input.status.trim())) {
    errors.push(`Invalid status: "${input.status}". Valid values: ${VALID_STATUSES.join(', ')}.`);
  }

  for (const reason of input.reasons) {
    const error = checkSkipReason(reason);
    if (error) errors.push(error);
  }

  for (const reason of input.termination) {
    const error = checkTerminationReason(reason);
    if (error) errors.push(error);
  }

  if (input.status?.trim() === 'Skipped' && input.reasons.length === 0) {
    errors.push('reasons is required when status is Skipped.');
  }

  if (input.status?.trim() === 'Closed' && input.termination.length === 0) {
    errors.push('termination is required when status is Closed.');
  }

  if (errors.length > 0) {
    const errorList = errors.map((errorMessage) => `  - ${errorMessage}`).join('\n');
    throw new Error(`Validation failed:\n${errorList}`);
  }
}

// ─── updateRole ───────────────────────────────────────────────────────────────

export function updateRole(sqlite: Database.Database, input: UpdateRoleInput): RoleRow {
  validateUpdateInput(input);
  requireRole(sqlite, input.id);

  const run = sqlite.transaction(() => {
    db.roles.updateStatus(sqlite, input.id, input.status.trim());

    db.skipReasons.insertMany(
      sqlite,
      input.id,
      input.reasons.map((reason) => ({ reason: reason.trim(), note: input.note ?? null }))
    );

    db.terminationReasons.insertMany(
      sqlite,
      input.id,
      input.termination.map((reason) => ({ reason: reason.trim(), note: input.note ?? null }))
    );
  });

  run();
  return db.roles.getById(sqlite, input.id)!;
}

// ─── Role deletion ────────────────────────────────────────────────────────────

export function previewRoleDeletion(sqlite: Database.Database, id: number): RoleDependents {
  const role = requireRole(sqlite, id);
  const dependents = fetchDependents(sqlite, id);

  return { role, ...dependents };
}

// eslint-disable-next-line max-lines-per-function -- already decomposed (requireRole/fetchDependents); overage is a multi-line error string, not logic; see semantic-testing-rules.md's "max-lines-per-function false positive" section
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

// ─── Skip reason edit ─────────────────────────────────────────────────────────

export function editSkipReason(
  sqlite: Database.Database,
  id: number,
  reason: string,
  note: string | null
): SkipReasonRow {
  const error = checkSkipReason(reason);
  if (error) {
    throw new Error(error);
  }

  if (!db.skipReasons.getById(sqlite, id)) {
    throw new SkipReasonNotFoundError(id);
  }

  db.skipReasons.update(sqlite, id, reason.trim(), note);
  return db.skipReasons.getById(sqlite, id)!;
}

// ─── Termination reason edit ──────────────────────────────────────────────────

export function editTerminationReason(
  sqlite: Database.Database,
  id: number,
  reason: string,
  note: string | null
): TerminationReasonRow {
  const error = checkTerminationReason(reason);
  if (error) {
    throw new Error(error);
  }

  if (!db.terminationReasons.getById(sqlite, id)) {
    throw new TerminationReasonNotFoundError(id);
  }

  db.terminationReasons.update(sqlite, id, reason.trim(), note);
  return db.terminationReasons.getById(sqlite, id)!;
}
