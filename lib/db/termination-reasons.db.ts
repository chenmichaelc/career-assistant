// lib/db/termination-reasons.db.ts
// Single-table CRUD for the termination_reasons table.
// No cross-table logic. No transactions. Callers own orchestration.

import Database from 'better-sqlite3';
import { TerminationReasonType } from '../types';

export interface TerminationReasonRow {
  id: number;
  role_id: number;
  reason: TerminationReasonType;
  note: string | null;
}

export function insert(
  sqlite: Database.Database,
  roleId: number,
  reason: string,
  note: string | null
): number {
  const result = sqlite
    .prepare(
      `
                INSERT INTO termination_reasons (role_id, reason, note)
                VALUES (@role_id, @reason, @note)
            `
    )
    .run({ role_id: roleId, reason, note });

  return Number(result.lastInsertRowid);
}

export function getAllByRoleId(sqlite: Database.Database, roleId: number): TerminationReasonRow[] {
  return sqlite
    .prepare(
      `
                SELECT id, role_id, reason, note
                FROM termination_reasons
                WHERE role_id = ?
                ORDER BY id
            `
    )
    .all(roleId) as TerminationReasonRow[];
}

export function getAllByRoleIds(
  sqlite: Database.Database,
  roleIds: number[]
): TerminationReasonRow[] {
  if (roleIds.length === 0) return [];
  return sqlite
    .prepare(
      `
                SELECT id, role_id, reason, note
                FROM termination_reasons
                WHERE role_id IN (SELECT value FROM json_each(?))
                ORDER BY role_id, id
            `
    )
    .all(JSON.stringify(roleIds)) as TerminationReasonRow[];
}

export function getById(sqlite: Database.Database, id: number): TerminationReasonRow | undefined {
  return sqlite
    .prepare(
      `
                SELECT id, role_id, reason, note
                FROM termination_reasons
                WHERE id = ?
            `
    )
    .get(id) as TerminationReasonRow | undefined;
}

export function deleteById(sqlite: Database.Database, id: number): Database.RunResult {
  return sqlite.prepare(`DELETE FROM termination_reasons WHERE id = ?`).run(id);
}

export function deleteAllByRoleId(sqlite: Database.Database, roleId: number): Database.RunResult {
  return sqlite.prepare(`DELETE FROM termination_reasons WHERE role_id = ?`).run(roleId);
}
