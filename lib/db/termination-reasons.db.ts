// lib/db/termination-reasons.db.ts
// Single-table CRUD for the termination_reasons table.
// No cross-table logic. No transactions. Callers own orchestration.

import Database                  from 'better-sqlite3';
import { TerminationReasonType } from '../types';

export interface TerminationReasonRow {
    id:      number;
    role_id: number;
    reason:  TerminationReasonType;
    note:    string | null;
}

export function insertTerminationReason(
    db:     Database.Database,
    roleId: number | string,
    reason: string,
    note:   string | null,
): number {
    const result = db.prepare(`
        INSERT INTO termination_reasons (role_id, reason, note)
        VALUES (@role_id, @reason, @note)
    `).run({ role_id: roleId, reason, note });

    return Number(result.lastInsertRowid);
}

export function getTerminationReasonsByRoleId(db: Database.Database, roleId: number | string): TerminationReasonRow[] {
    return db.prepare(`
        SELECT id, role_id, reason, note
        FROM termination_reasons
        WHERE role_id = ?
        ORDER BY id ASC
    `).all(roleId) as TerminationReasonRow[];
}

export function getTerminationReasonById(db: Database.Database, id: number): TerminationReasonRow | undefined {
    return db.prepare(`
    SELECT id, role_id, reason, note
    FROM termination_reasons
    WHERE id = ?
  `).get(id) as TerminationReasonRow | undefined;
}

export function deleteTerminationReasonById(db: Database.Database, id: number): Database.RunResult {
    return db.prepare(`DELETE FROM termination_reasons WHERE id = ?`).run(id);
}

export function deleteTerminationReasonsByRoleId(db: Database.Database, roleId: number): Database.RunResult {
    return db.prepare(`DELETE FROM termination_reasons WHERE role_id = ?`).run(roleId);
}