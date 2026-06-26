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

export type RoleSortKey = 'id' | 'company' | 'title' | 'role_status' | 'candidacy' | 'applied_date';

export function insertRole(sqlite: Database.Database, data: RoleInsertData): number {
  const result = sqlite
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

export function getAll(
  sqlite: Database.Database,
  statuses: string[] = [],
  company?: string,
  sortColumn: RoleSortKey = 'id',
  sortOrder: 'ASC' | 'DESC' = 'DESC'
): RoleRow[] {
  let query = `
        SELECT id, company, title, url, role_status, candidacy,
               applied_date, salary_min, salary_max, notes, created_at, updated_at
        FROM roles
        WHERE 1=1
    `;
  const params: (string | number)[] = [];

  if (statuses.length > 0) {
    const placeholders = statuses.map(() => '?').join(', ');
    query += ` AND role_status IN (${placeholders})`;
    params.push(...statuses);
  }

  if (company) {
    query += ` AND company LIKE ?`;
    params.push(`%${company}%`);
  }

  query += ` ORDER BY ${sortColumn} ${sortOrder}`;

  return sqlite.prepare(query).all(...params) as RoleRow[];
}

export function getById(sqlite: Database.Database, id: number): RoleRow | undefined {
  return sqlite
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

export function updateStatus(
  sqlite: Database.Database,
  id: number,
  status: string
): Database.RunResult {
  return sqlite
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

export function deleteById(sqlite: Database.Database, id: number): Database.RunResult {
  return sqlite.prepare(`DELETE FROM roles WHERE id = ?`).run(id);
}

export function getIdsByCompanies(
  sqlite: Database.Database,
  companies: string[]
): { id: number }[] {
  if (companies.length === 0) return [];
  return sqlite
    .prepare(
      `
                SELECT id
                FROM roles
                WHERE company IN (SELECT value FROM json_each(?))
            `
    )
    .all(JSON.stringify(companies)) as { id: number }[];
}
