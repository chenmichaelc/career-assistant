// tests/unit/job-stubs.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import {
  addStub,
  patchParsedFields,
  updateJobStubStatus,
  DuplicateStubUrlError,
  DuplicateRoleUrlError,
  JobStubNotFoundError,
  InvalidParsedFieldsError,
} from '../../lib/job-stubs';
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
    const role: RoleInput = {
      company: 'Acme',
      title: 'Eng',
      url: 'https://example.com/jobs/2',
      role_status: 'Pending Triage',
      jd: 'A job.',
    };
    addRole(sqlite, role);
    expect(() => addStub(sqlite, role.url)).toThrow(DuplicateRoleUrlError);
  });
});

// ─── patchParsedFields ────────────────────────────────────────────────

describe('patchParsedFields', () => {
  test('writes only the provided fields, leaving the rest untouched', () => {
    const id = addStub(sqlite, 'https://example.com/jobs/1');
    patchParsedFields(sqlite, id, { company: 'Acme', title: 'Eng' });

    const stub = patchParsedFields(sqlite, id, { company: 'Updated Co' });

    expect(stub.parsed_company).toBe('Updated Co');
    expect(stub.parsed_title).toBe('Eng');
  });

  test('does not advance status, unlike importParsedFields', () => {
    const id = addStub(sqlite, 'https://example.com/jobs/1');
    const stub = patchParsedFields(sqlite, id, { company: 'Acme' });
    expect(stub.status).toBe('Stubbed');
  });

  test('rejects an invalid enum value without writing anything', () => {
    const id = addStub(sqlite, 'https://example.com/jobs/1');
    expect(() => patchParsedFields(sqlite, id, { candidacy: 'Not A Real Value' })).toThrow(
      InvalidParsedFieldsError
    );
    expect(db.jobStubs.getById(sqlite, id)?.parsed_candidacy).toBeNull();
  });

  test('throws JobStubNotFoundError for a nonexistent stub', () => {
    expect(() => patchParsedFields(sqlite, 9999, { company: 'Acme' })).toThrow(
      JobStubNotFoundError
    );
  });
});

// ─── updateJobStubStatus ───────────────────────────────────────────────

describe('updateJobStubStatus', () => {
  test('updates the status', () => {
    const id = addStub(sqlite, 'https://example.com/jobs/1');
    const stub = updateJobStubStatus(sqlite, id, 'Ready to Promote');
    expect(stub.status).toBe('Ready to Promote');
  });

  test('rejects a value outside the status vocabulary', () => {
    const id = addStub(sqlite, 'https://example.com/jobs/1');
    expect(() => updateJobStubStatus(sqlite, id, 'Not A Real Value')).toThrow();
  });

  test('throws JobStubNotFoundError for a nonexistent stub', () => {
    expect(() => updateJobStubStatus(sqlite, 9999, 'Parsed')).toThrow(JobStubNotFoundError);
  });
});
