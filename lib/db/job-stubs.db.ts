// lib/db/job-stubs.db.ts

import Database from 'better-sqlite3';
import { JobStubRow } from '../types';

export function insertStub(sqlite: Database.Database, url: string): number {
  const result = sqlite
    .prepare(
      `
                INSERT INTO job_stubs (url)
                VALUES (@url)
            `
    )
    .run({ url });

  return Number(result.lastInsertRowid);
}

const JOB_STUB_COLUMNS = `
  id, url, status, raw_content,
  parsed_company, parsed_title, parsed_description,
  parsed_salary_min, parsed_salary_max,
  parsed_candidacy, parsed_role_status,
  parsed_skip_reasons, parsed_termination_reasons,
  created_at
`;

export function getAll(sqlite: Database.Database): JobStubRow[] {
  return sqlite
    .prepare(
      `
                SELECT ${JOB_STUB_COLUMNS}
                FROM job_stubs
                ORDER BY id DESC
            `
    )
    .all() as JobStubRow[];
}

export function getById(sqlite: Database.Database, id: number): JobStubRow | undefined {
  return sqlite
    .prepare(
      `
                SELECT ${JOB_STUB_COLUMNS}
                FROM job_stubs
                WHERE id = ?
            `
    )
    .get(id) as JobStubRow | undefined;
}

export function getByUrl(sqlite: Database.Database, url: string): JobStubRow | undefined {
  return sqlite
    .prepare(
      `
                SELECT ${JOB_STUB_COLUMNS}
                FROM job_stubs
                WHERE url = ?
            `
    )
    .get(url) as JobStubRow | undefined;
}

export function getAllByUrlPrefix(sqlite: Database.Database, urlPrefix: string): JobStubRow[] {
  return sqlite
    .prepare(
      `
                SELECT ${JOB_STUB_COLUMNS}
                FROM job_stubs
                WHERE url LIKE @pattern ESCAPE '\\'
            `
    )
    .all({
      pattern: `${urlPrefix.replace(/[\\%_]/g, '\\$&')}%`,
    }) as JobStubRow[];
}

export function setRawContent(
  sqlite: Database.Database,
  id: number,
  rawContent: string
): Database.RunResult {
  return sqlite
    .prepare(
      `
                UPDATE job_stubs
                SET raw_content = @raw_content, status = 'Scraped'
                WHERE id = @id
            `
    )
    .run({ id, raw_content: rawContent });
}

export function updateStatus(
  sqlite: Database.Database,
  id: number,
  status: string
): Database.RunResult {
  return sqlite
    .prepare(
      `
                UPDATE job_stubs
                SET status = @status
                WHERE id = @id
            `
    )
    .run({ id, status });
}

export function setParsedCandidacy(
  sqlite: Database.Database,
  id: number,
  candidacy: string
): Database.RunResult {
  return sqlite
    .prepare(
      `
                UPDATE job_stubs
                SET parsed_candidacy = @candidacy
                WHERE id = @id
            `
    )
    .run({ id, candidacy });
}

export function setParsedRoleStatus(
  sqlite: Database.Database,
  id: number,
  roleStatus: string
): Database.RunResult {
  return sqlite
    .prepare(
      `
                UPDATE job_stubs
                SET parsed_role_status = @role_status
                WHERE id = @id
            `
    )
    .run({ id, role_status: roleStatus });
}

export function deleteById(sqlite: Database.Database, id: number): Database.RunResult {
  return sqlite.prepare(`DELETE FROM job_stubs WHERE id = ?`).run(id);
}
