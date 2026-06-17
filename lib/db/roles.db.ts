// lib/db/roles.db.ts
// Single-table CRUD for the roles table.
// No cross-table logic. No transactions. Callers own orchestration.

import Database from 'better-sqlite3';
import { RoleRow } from '../types';

export interface RoleInsertData {
  company: string;
  title: string;
  url: string;
  role_status: string;
  candidacy?: string | null;
  applied_date?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  notes?: string | null;
}

export function insertRole(db: Database.Database, data: RoleInsertData): number {
  const result = db
    .prepare(
      `
        INSERT INTO roles (company, title, url, role_status, candidacy, applied_date, salary_min, salary_max, notes)
        VALUES (@company, @title, @url, @role_status, @candidacy, @applied_date, @salary_min, @salary_max, @notes)
    `
    )
    .run({
      company: data.company,
      title: data.title,
      url: data.url,
      role_status: data.role_status,
      candidacy: data.candidacy ?? null,
      applied_date: data.applied_date ?? null,
      salary_min: data.salary_min ?? null,
      salary_max: data.salary_max ?? null,
      notes: data.notes ?? null,
    });

  return Number(result.lastInsertRowid);
}

export function getRoleById(db: Database.Database, id: number): RoleRow | undefined {
  return db
    .prepare(
      `
        SELECT id, company, title, url, role_status, candidacy, applied_date,
               salary_min, salary_max, notes, created_at, updated_at
        FROM roles
        WHERE id = ?
    `
    )
    .get(id) as RoleRow | undefined;
}

export function updateRoleStatus(
  db: Database.Database,
  id: number,
  status: string
): Database.RunResult {
  return db
    .prepare(
      `
    UPDATE roles
    SET role_status  = @role_status,
        applied_date = CASE
          WHEN @role_status = 'Applied' AND applied_date IS NULL
          THEN date('now')
          ELSE applied_date
        END,
        updated_at   = datetime('now')
    WHERE id = @id
  `
    )
    .run({ role_status: status, id });
}

export function deleteRoleById(db: Database.Database, id: number): Database.RunResult {
  return db.prepare(`DELETE FROM roles WHERE id = ?`).run(id);
}
