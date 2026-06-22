// lib/db/job-descriptions.db.ts
// Single-table CRUD for the job_descriptions table.
// No cross-table logic. No transactions. Callers own orchestration.

import Database from 'better-sqlite3';

export interface JobDescriptionRow {
  id: number;
  role_id: number;
  content: string;
}

export function insert(sqlite: Database.Database, roleId: number, content: string): number {
  const result = sqlite
    .prepare(
      `
            INSERT INTO job_descriptions (role_id, content)
            VALUES (@role_id, @content)
          `
    )
    .run({ role_id: roleId, content });

  return Number(result.lastInsertRowid);
}

export function getByRoleId(
  sqlite: Database.Database,
  roleId: number
): JobDescriptionRow | undefined {
  return sqlite
    .prepare(
      `
            SELECT id, role_id, content
            FROM job_descriptions
            WHERE role_id = ?
          `
    )
    .get(roleId) as JobDescriptionRow | undefined;
}

export function deleteByRoleId(sqlite: Database.Database, roleId: number): Database.RunResult {
  return sqlite.prepare(`DELETE FROM job_descriptions WHERE role_id = ?`).run(roleId);
}
