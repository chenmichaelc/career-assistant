// tests/unit/job-stub-parse-contract.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import { addStub, importParsedFields, InvalidParsedFieldsError } from '../../lib/job-stubs';
import { db } from '../../lib/db';
import {
  JOB_STUB_PARSE_CONTRACT_FIXTURE,
  JOB_STUB_PARSE_CONTRACT_INVALID_FIXTURE,
} from '../fixtures/jobStubParseContract.fixture';

let sqlite: Database.Database;

beforeEach(() => {
  sqlite = createTestDb();
});
afterEach(() => {
  sqlite.close();
});

describe('importParsedFields against the canonical fixture', () => {
  test('writes every field into the stub and advances status to Parsed', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');

    const stub = importParsedFields(sqlite, stubId, JOB_STUB_PARSE_CONTRACT_FIXTURE);

    expect(stub.status).toBe('Parsed');
    expect(stub.parsed_company).toBe(JOB_STUB_PARSE_CONTRACT_FIXTURE.company);
    expect(stub.parsed_title).toBe(JOB_STUB_PARSE_CONTRACT_FIXTURE.title);
    expect(stub.parsed_description).toBe(JOB_STUB_PARSE_CONTRACT_FIXTURE.description);
    expect(stub.parsed_salary_min).toBe(JOB_STUB_PARSE_CONTRACT_FIXTURE.salary_min);
    expect(stub.parsed_salary_max).toBe(JOB_STUB_PARSE_CONTRACT_FIXTURE.salary_max);
    expect(stub.parsed_candidacy).toBe(JOB_STUB_PARSE_CONTRACT_FIXTURE.candidacy);
    expect(stub.parsed_role_status).toBe(JOB_STUB_PARSE_CONTRACT_FIXTURE.role_status);
    expect(stub.parsed_location).toBe(JOB_STUB_PARSE_CONTRACT_FIXTURE.location);
    expect(stub.parsed_in_office_expectation).toBe(
      JOB_STUB_PARSE_CONTRACT_FIXTURE.in_office_expectation
    );
    expect(JSON.parse(stub.parsed_skip_reasons!)).toEqual(
      JOB_STUB_PARSE_CONTRACT_FIXTURE.skip_reasons
    );
    expect(JSON.parse(stub.parsed_termination_reasons!)).toEqual(
      JOB_STUB_PARSE_CONTRACT_FIXTURE.termination_reasons
    );
  });

  test('an empty object is valid input and still advances status to Parsed', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');

    const stub = importParsedFields(sqlite, stubId, {});

    expect(stub.status).toBe('Parsed');
    expect(stub.parsed_company).toBeNull();
  });

  test('a re-import fully replaces the prior parsed state, not merges into it', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');
    importParsedFields(sqlite, stubId, JOB_STUB_PARSE_CONTRACT_FIXTURE);

    const stub = importParsedFields(sqlite, stubId, { company: 'Only Company' });

    expect(stub.parsed_company).toBe('Only Company');
    expect(stub.parsed_title).toBeNull();
    expect(stub.parsed_skip_reasons).toBeNull();
  });
});

describe('importParsedFields against the invalid fixture', () => {
  test('rejects the whole import, writes nothing, names the failing field', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');

    expect(() =>
      importParsedFields(sqlite, stubId, JOB_STUB_PARSE_CONTRACT_INVALID_FIXTURE)
    ).toThrow(InvalidParsedFieldsError);

    let thrown: unknown;
    try {
      importParsedFields(sqlite, stubId, JOB_STUB_PARSE_CONTRACT_INVALID_FIXTURE);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(InvalidParsedFieldsError);
    expect((thrown as InvalidParsedFieldsError).issues.join('\n')).toContain(
      'in_office_expectation'
    );
  });

  test('rejects without writing any column or advancing status', () => {
    const stubId = addStub(sqlite, 'https://example.com/jobs/1');
    const before = db.jobStubs.getById(sqlite, stubId)!;

    expect(() =>
      importParsedFields(sqlite, stubId, JOB_STUB_PARSE_CONTRACT_INVALID_FIXTURE)
    ).toThrow();

    const after = db.jobStubs.getById(sqlite, stubId)!;
    expect(after.status).toBe(before.status);
    expect(after.parsed_company).toBeNull();
    expect(after.parsed_location).toBeNull();
  });
});
