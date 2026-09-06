// tests/unit/job-stubs.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import { addStub, DuplicateStubUrlError, DuplicateRoleUrlError } from '../../lib/job-stubs';
import { db } from '../../lib/db';

let sqlite: Database.Database;

beforeEach(() => {
  sqlite = createTestDb();
});
afterEach(() => {
  sqlite.close();
});

// ─── addStub ────────────────────────────────────────────────────────

describe('addStub', () => {
  test('inserts a cleansed URL and returns a numeric id', () => {
    const id = addStub(sqlite, 'https://example.com/jobs/1?utm_source=linkedin');
    expect(typeof id).toBe('number');
    const stub = db.jobStubs.getById(sqlite, id);
    expect(stub?.url).toBe('https://example.com/jobs/1');
  });

  test('rejects a duplicate URL against an existing stub, even when differently decorated', () => {
    addStub(sqlite, 'https://example.com/jobs/1');
    expect(() => addStub(sqlite, 'http://EXAMPLE.com/jobs/1/?utm_source=x')).toThrow(
      DuplicateStubUrlError
    );
  });

  test('rejects a URL that already exists as a promoted role', () => {
    sqlite
      .prepare(
        `INSERT INTO roles (company, title, url, role_status) VALUES ('Acme', 'Eng', 'https://example.com/jobs/2', 'Applied')`
      )
      .run();
    expect(() => addStub(sqlite, 'https://example.com/jobs/2')).toThrow(DuplicateRoleUrlError);
  });
});
