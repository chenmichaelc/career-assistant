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
  parsed_location, parsed_in_office_expectation,
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

export function setParsedInOfficeExpectation(
  sqlite: Database.Database,
  id: number,
  inOfficeExpectation: string
): Database.RunResult {
  return sqlite
    .prepare(
      `
                UPDATE job_stubs
                SET parsed_in_office_expectation = @in_office_expectation
                WHERE id = @id
            `
    )
    .run({ id, in_office_expectation: inOfficeExpectation });
}

export interface ParsedFieldsUpdate {
  parsed_company?: string | null;
  parsed_title?: string | null;
  parsed_description?: string | null;
  parsed_salary_min?: number | null;
  parsed_salary_max?: number | null;
  parsed_candidacy?: string | null;
  parsed_role_status?: string | null;
  parsed_skip_reasons?: string | null;
  parsed_termination_reasons?: string | null;
  parsed_location?: string | null;
  parsed_in_office_expectation?: string | null;
}

export function setParsedFields(
  sqlite: Database.Database,
  id: number,
  data: ParsedFieldsUpdate
): Database.RunResult | null {
  return patchParsedFields(sqlite, id, {
    parsed_company: data.parsed_company ?? null,
    parsed_title: data.parsed_title ?? null,
    parsed_description: data.parsed_description ?? null,
    parsed_salary_min: data.parsed_salary_min ?? null,
    parsed_salary_max: data.parsed_salary_max ?? null,
    parsed_candidacy: data.parsed_candidacy ?? null,
    parsed_role_status: data.parsed_role_status ?? null,
    parsed_skip_reasons: data.parsed_skip_reasons ?? null,
    parsed_termination_reasons: data.parsed_termination_reasons ?? null,
    parsed_location: data.parsed_location ?? null,
    parsed_in_office_expectation: data.parsed_in_office_expectation ?? null,
  });
}

export function patchParsedFields(
  sqlite: Database.Database,
  id: number,
  data: ParsedFieldsUpdate
): Database.RunResult | null {
  const columns = Object.keys(data) as (keyof ParsedFieldsUpdate)[];
  if (columns.length === 0) return null;

  const setClause = columns.map((column) => `${column} = @${column}`).join(', ');
  return sqlite.prepare(`UPDATE job_stubs SET ${setClause} WHERE id = @id`).run({ id, ...data });
}

export function deleteById(sqlite: Database.Database, id: number): Database.RunResult {
  return sqlite.prepare(`DELETE FROM job_stubs WHERE id = ?`).run(id);
}
