// lib/db/skip-reasons.db.ts
// Single-table CRUD for the skip_reasons table.
// No cross-table logic. No transactions. Callers own orchestration.

import Database           from 'better-sqlite3';
import { SkipReasonType } from '../types';

export interface SkipReasonRow {
    id:      number;
    role_id: number;
    reason:  SkipReasonType;
    note:    string | null;
}

export function insertSkipReason(
    db:     Database.Database,
    roleId: number | string,
    reason: string,
    note:   string | null,
): number {
    const result = db.prepare(`
        INSERT INTO skip_reasons (role_id, reason, note)
        VALUES (@role_id, @reason, @note)
    `).run({ role_id: roleId, reason, note });

    return Number(result.lastInsertRowid);
}

export function getSkipReasonsByRoleId(db: Database.Database, roleId: number | string): SkipReasonRow[] {
    return db.prepare(`
        SELECT id, role_id, reason, note
        FROM skip_reasons
        WHERE role_id = ?
        ORDER BY id ASC
    `).all(roleId) as SkipReasonRow[];
}

export function getSkipReasonById(db: Database.Database, id: number): SkipReasonRow | undefined {
    return db.prepare(`
        SELECT id, role_id, reason, note
        FROM skip_reasons
        WHERE id = ?
    `).get(id) as SkipReasonRow | undefined;
}

export function deleteSkipReasonById(db: Database.Database, id: number): Database.RunResult {
    return db.prepare(`DELETE FROM skip_reasons WHERE id = ?`).run(id);
}

export function deleteSkipReasonsByRoleId(db: Database.Database, roleId: number): Database.RunResult {
    return db.prepare(`DELETE FROM skip_reasons WHERE role_id = ?`).run(roleId);
}