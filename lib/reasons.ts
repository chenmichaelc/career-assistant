// lib/reasons.ts

import Database from 'better-sqlite3';
import {
  VALID_SKIP_REASONS,
  VALID_TERMINATION_REASONS,
  isSkipReasonType,
  isTerminationReasonType,
} from './types';
import { db } from './db';

// ─── Errors ───────────────────────────────────────────────────────────────────

export class RoleNotFoundError extends Error {
  constructor(roleId: number) {
    super(`No role found with ID ${roleId}.`);
    this.name = 'RoleNotFoundError';
  }
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

// ─── Use cases ────────────────────────────────────────────────────────────────

function requireRole(sqlite: Database.Database, roleId: number): void {
  if (!db.roles.getById(sqlite, roleId)) {
    throw new RoleNotFoundError(roleId);
  }
}

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

  requireRole(sqlite, roleId);

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

  requireRole(sqlite, roleId);

  return db.terminationReasons.insert(sqlite, roleId, reason.trim(), note);
}
