// tests/unit/admin.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import { cleanupTestRoles, cleanupTestStubs } from '../../lib/admin';
import { addRole } from '../../lib/roles';
import { db } from '../../lib/db';
import { RoleInput } from '../../lib/types';

let sqlite: Database.Database;

beforeEach(() => {
  sqlite = createTestDb();
});

afterEach(() => {
  sqlite.close();
});

function makeRole(overrides: Partial<RoleInput> = {}): RoleInput {
  return {
    company: '[E2E] Acme Corp',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'A job description.',
    ...overrides,
  };
}

// ─── cleanupTestRoles ───────────────────────────────────────────────

describe('cleanupTestRoles', () => {
  test('deletes only roles matching the given company names', () => {
    const testCompany = '[E2E] Acme Corp';
    const matchingId = addRole(
      sqlite,
      makeRole({ company: testCompany, url: 'https://example.com/job/1' })
    );
    const otherId = addRole(
      sqlite,
      makeRole({ company: 'Real Company', url: 'https://example.com/job/2' })
    );

    const result = cleanupTestRoles(sqlite, [testCompany]);

    expect(result.deleted).toEqual([matchingId]);
    expect(result.count).toBe(1);
    expect(db.roles.getById(sqlite, matchingId)).toBeUndefined();
    expect(db.roles.getById(sqlite, otherId)).not.toBeUndefined();
  });

  test('returns an empty result when no roles match', () => {
    const result = cleanupTestRoles(sqlite, ['[E2E] Acme Corp']);
    expect(result).toEqual({ deleted: [], count: 0 });
  });
});

// ─── cleanupTestStubs ───────────────────────────────────────────────

describe('cleanupTestStubs', () => {
  test('deletes only stubs whose URL starts with the given prefix', () => {
    const urlPrefix = 'https://e2e.testing.stub.com/';
    const matchingId = db.jobStubs.insertStub(sqlite, `${urlPrefix}chromium/1`);
    const otherId = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');

    const result = cleanupTestStubs(sqlite, urlPrefix);

    expect(result.deleted).toEqual([matchingId]);
    expect(result.count).toBe(1);
    expect(db.jobStubs.getById(sqlite, matchingId)).toBeUndefined();
    expect(db.jobStubs.getById(sqlite, otherId)).not.toBeUndefined();
  });

  test('returns an empty result when no stubs match', () => {
    const result = cleanupTestStubs(sqlite, 'https://e2e.testing.stub.com/');
    expect(result).toEqual({ deleted: [], count: 0 });
  });
});
