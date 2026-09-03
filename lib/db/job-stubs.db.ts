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

export function getAll(sqlite: Database.Database): JobStubRow[] {
  return sqlite
    .prepare(
      `
                SELECT id, url, status, raw_content, created_at
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
                SELECT id, url, status, raw_content, created_at
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
                SELECT id, url, status, raw_content, created_at
                FROM job_stubs
                WHERE url = ?
            `
    )
    .get(url) as JobStubRow | undefined;
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
                SET raw_content = @raw_content, status = 'content_added'
                WHERE id = @id
            `
    )
    .run({ id, raw_content: rawContent });
}

export function deleteById(sqlite: Database.Database, id: number): Database.RunResult {
  return sqlite.prepare(`DELETE FROM job_stubs WHERE id = ?`).run(id);
}
