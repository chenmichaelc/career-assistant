// tests/unit/job-stubs.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import {
  addStub,
  patchParsedFields,
  updateJobStubStatus,
  updateRawContent,
  DuplicateStubUrlError,
  DuplicateRoleUrlError,
  EmptyRawContentError,
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

describe('addStub with raw content', () => {
  const stubUrl = 'https://example.com/jobs/1';
  const postingText = 'Full posting text.';

  test('creates the stub with its raw content and status Scraped', () => {
    const stubId = addStub(sqlite, stubUrl, postingText);
    const stub = db.jobStubs.getById(sqlite, stubId);
    expect(stub?.raw_content).toBe(postingText);
    expect(stub?.status).toBe('Scraped');
  });

  test('a URL-only stub has no raw content and stays Stubbed', () => {
    const stubId = addStub(sqlite, stubUrl);
    const stub = db.jobStubs.getById(sqlite, stubId);
    expect(stub?.raw_content).toBeNull();
    expect(stub?.status).toBe('Stubbed');
  });

  test.each([
    ['an empty string', ''],
    ['whitespace only', '  \n\t '],
  ])('%s is rejected and no stub is created', (_description, rawContent) => {
    expect(() => addStub(sqlite, stubUrl, rawContent)).toThrow(EmptyRawContentError);
    expect(db.jobStubs.getAll(sqlite)).toHaveLength(0);
  });

  test('a duplicate URL is rejected and leaves the existing stub untouched', () => {
    const existingStubId = addStub(sqlite, stubUrl);
    expect(() => addStub(sqlite, stubUrl, postingText)).toThrow(DuplicateStubUrlError);

    const existingStub = db.jobStubs.getById(sqlite, existingStubId);
    expect(existingStub?.raw_content).toBeNull();
    expect(existingStub?.status).toBe('Stubbed');
  });

  test('a failure while finishing creation leaves no stub behind (rollback)', () => {
    // The trigger is only a deterministic way to fail after the INSERT has
    // already run; any failure inside the transaction exercises the rollback.
    sqlite.exec(`
      CREATE TRIGGER fail_scraped_status
      BEFORE UPDATE OF status ON job_stubs
      WHEN NEW.status = 'Scraped'
      BEGIN
        SELECT RAISE(ABORT, 'forced failure');
      END
    `);

    expect(() => addStub(sqlite, stubUrl, postingText)).toThrow('forced failure');
    expect(db.jobStubs.getAll(sqlite)).toHaveLength(0);
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

// ─── updateRawContent ───────────────────────────────────────────────────

describe('updateRawContent', () => {
  test('updates the raw content without changing status', () => {
    const id = addStub(sqlite, 'https://example.com/jobs/1');
    const stub = updateRawContent(sqlite, id, 'Full posting text.');
    expect(stub.raw_content).toBe('Full posting text.');
    expect(stub.status).toBe('Stubbed');
  });

  test('throws JobStubNotFoundError for a nonexistent stub', () => {
    expect(() => updateRawContent(sqlite, 9999, 'text')).toThrow(JobStubNotFoundError);
  });
});
