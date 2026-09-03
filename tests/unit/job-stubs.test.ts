// tests/unit/job-stubs.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import {
  addStub,
  promoteStub,
  DuplicateStubUrlError,
  DuplicateRoleUrlError,
  StubNotFoundError,
} from '../../lib/job-stubs';
import { db } from '../../lib/db';
import { RoleInput } from '../../lib/types';

let sqlite: Database.Database;

beforeEach(() => {
  sqlite = createTestDb();
});
afterEach(() => {
  sqlite.close();
});

const baseRole: RoleInput = {
  company: 'Acme',
  title: 'Engineer',
  url: 'https://example.com/jobs/1',
  role_status: 'Resume Needed',
  jd: 'Do engineering things.',
};

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

// ─── promoteStub ────────────────────────────────────────────────────

describe('promoteStub — happy path', () => {
  test('creates the role and deletes the stub', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');
    const roleId = promoteStub(sqlite, stubId, baseRole);

    expect(db.jobStubs.getById(sqlite, stubId)).toBeUndefined();
    const role = sqlite.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
    expect(role).toBeDefined();
  });

  test('creates the job_description row via the reused addRole logic', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');
    const roleId = promoteStub(sqlite, stubId, baseRole);

    const jd = sqlite.prepare('SELECT * FROM job_descriptions WHERE role_id = ?').get(roleId) as
      | { content: string }
      | undefined;
    expect(jd?.content).toBe('Do engineering things.');
  });

  test('does not require the role url to match the stub url', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');
    const roleId = promoteStub(sqlite, stubId, {
      ...baseRole,
      url: 'https://example.com/jobs/1-corrected',
    });
    const role = sqlite.prepare('SELECT url FROM roles WHERE id = ?').get(roleId) as {
      url: string;
    };
    expect(role.url).toBe('https://example.com/jobs/1-corrected');
  });
});

describe('promoteStub — atomicity on invalid role data', () => {
  test('throws when the role data fails addRole validation', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');
    expect(() => promoteStub(sqlite, stubId, { ...baseRole, title: '' })).toThrow();
  });

  test('does NOT delete the stub when the role insert fails', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');
    try {
      promoteStub(sqlite, stubId, { ...baseRole, title: '' });
    } catch {
      // expected
    }
    expect(db.jobStubs.getById(sqlite, stubId)).toBeDefined();
  });

  test('does NOT create a partial role when the insert fails', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');
    try {
      promoteStub(sqlite, stubId, { ...baseRole, title: '' });
    } catch {
      // expected
    }
    const count = (sqlite.prepare('SELECT COUNT(*) as c FROM roles').get() as { c: number }).c;
    expect(count).toBe(0);
  });
});

describe('promoteStub — nonexistent stub', () => {
  test('throws StubNotFoundError', () => {
    expect(() => promoteStub(sqlite, 9999, baseRole)).toThrow(StubNotFoundError);
  });
});
