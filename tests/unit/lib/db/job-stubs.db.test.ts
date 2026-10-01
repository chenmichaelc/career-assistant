// tests/unit/lib/db/job-stubs.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../helpers/db';
import { db } from '../../../../lib/db';
import {
  VALID_STATUSES,
  VALID_CANDIDACIES,
  VALID_JOB_STUB_STATUSES,
  VALID_IN_OFFICE_EXPECTATIONS,
} from '../../../../lib/types';

let sqlite: Database.Database;

beforeEach(() => {
  sqlite = createTestDb();
});
afterEach(() => {
  sqlite.close();
});

// ─── insertStub ─────────────────────────────────────────────────────

describe('insertStub', () => {
  test('inserts a stub and returns a numeric ID', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('defaults status to Stubbed', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    const stub = db.jobStubs.getById(sqlite, id);
    expect(stub?.status).toBe('Stubbed');
  });

  test('defaults all parsed_* fields to null', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    const stub = db.jobStubs.getById(sqlite, id);
    expect(stub?.parsed_company).toBeNull();
    expect(stub?.parsed_title).toBeNull();
    expect(stub?.parsed_description).toBeNull();
    expect(stub?.parsed_salary_min).toBeNull();
    expect(stub?.parsed_salary_max).toBeNull();
    expect(stub?.parsed_candidacy).toBeNull();
    expect(stub?.parsed_role_status).toBeNull();
    expect(stub?.parsed_skip_reasons).toBeNull();
    expect(stub?.parsed_termination_reasons).toBeNull();
    expect(stub?.parsed_location).toBeNull();
    expect(stub?.parsed_in_office_expectation).toBeNull();
  });

  test('sets created_at', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    const stub = db.jobStubs.getById(sqlite, id);
    expect(stub?.created_at).toBeTruthy();
  });

  test('rejects a duplicate URL at the DB level (UNIQUE constraint)', () => {
    db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    expect(() => db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1')).toThrow();
  });
});

// ─── getAll ─────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns an empty array when there are no stubs', () => {
    expect(db.jobStubs.getAll(sqlite)).toEqual([]);
  });

  test('returns all stubs, most recently created first', () => {
    const firstId = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    const secondId = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/2');
    const all = db.jobStubs.getAll(sqlite);
    expect(all.map((stub) => stub.id)).toEqual([secondId, firstId]);
  });
});

// ─── getById ────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns the matching stub', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    const stub = db.jobStubs.getById(sqlite, id);
    expect(stub?.url).toBe('https://example.com/jobs/1');
  });

  test('returns undefined for a nonexistent id', () => {
    expect(db.jobStubs.getById(sqlite, 9999)).toBeUndefined();
  });
});

// ─── getByUrl ───────────────────────────────────────────────────────

describe('getByUrl', () => {
  test('returns the matching stub', () => {
    db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    const stub = db.jobStubs.getByUrl(sqlite, 'https://example.com/jobs/1');
    expect(stub?.url).toBe('https://example.com/jobs/1');
  });

  test('returns undefined for a URL with no matching stub', () => {
    expect(db.jobStubs.getByUrl(sqlite, 'https://example.com/nope')).toBeUndefined();
  });
});

// ─── getAllByUrlPrefix ──────────────────────────────────────────────

describe('getAllByUrlPrefix', () => {
  test('returns only stubs whose URL starts with the prefix', () => {
    const urlPrefix = 'https://e2e.testing.stub.com/';
    const chromiumUrl = `${urlPrefix}chromium/1`;
    const firefoxUrl = `${urlPrefix}firefox/2`;
    db.jobStubs.insertStub(sqlite, chromiumUrl);
    db.jobStubs.insertStub(sqlite, firefoxUrl);
    db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');

    const matches = db.jobStubs.getAllByUrlPrefix(sqlite, urlPrefix);

    expect(matches).toHaveLength(2);
    expect(matches.map((stub) => stub.url).sort()).toEqual([chromiumUrl, firefoxUrl].sort());
  });

  test('returns an empty array when nothing matches', () => {
    db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    expect(db.jobStubs.getAllByUrlPrefix(sqlite, 'https://e2e.testing.stub.com/')).toEqual([]);
  });

  test('treats % in the prefix as a literal character, not a SQL wildcard', () => {
    const urlPrefix = 'https://example.com/100%off/';
    const matchingUrl = `${urlPrefix}1`;
    db.jobStubs.insertStub(sqlite, matchingUrl);
    // Would match if the '%' above were left unescaped, since LIKE would then
    // treat it as "any characters" and match this decoy too.
    db.jobStubs.insertStub(sqlite, 'https://example.com/100XXXoff/1');

    const matches = db.jobStubs.getAllByUrlPrefix(sqlite, urlPrefix);

    expect(matches).toHaveLength(1);
    expect(matches[0].url).toBe(matchingUrl);
  });

  test('treats _ in the prefix as a literal character, not a SQL wildcard', () => {
    const urlPrefix = 'https://example.com/100_off/';
    const matchingUrl = `${urlPrefix}1`;
    db.jobStubs.insertStub(sqlite, matchingUrl);
    // Would match if the '_' above were left unescaped, since LIKE would then
    // treat it as "any single character" and match this decoy too.
    db.jobStubs.insertStub(sqlite, 'https://example.com/100Xoff/1');

    const matches = db.jobStubs.getAllByUrlPrefix(sqlite, urlPrefix);

    expect(matches).toHaveLength(1);
    expect(matches[0].url).toBe(matchingUrl);
  });
});

// ─── setRawContent ──────────────────────────────────────────────────

describe('setRawContent', () => {
  test('stores the raw content and advances status to Scraped', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    db.jobStubs.setRawContent(sqlite, id, 'Full posting text.');
    const stub = db.jobStubs.getById(sqlite, id);
    expect(stub?.raw_content).toBe('Full posting text.');
    expect(stub?.status).toBe('Scraped');
  });
});

// ─── job_stubs.status CHECK constraint ─────────────────────────────

describe('status CHECK constraint', () => {
  test('accepts every value in the status vocabulary', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    for (const status of VALID_JOB_STUB_STATUSES) {
      expect(() => db.jobStubs.updateStatus(sqlite, id, status)).not.toThrow();
    }
  });

  test('rejects a value outside the status vocabulary', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    expect(() => db.jobStubs.updateStatus(sqlite, id, 'unscraped')).toThrow();
  });
});

// ─── parsed_candidacy / parsed_role_status CHECK constraints ────────

describe('parsed_candidacy CHECK constraint', () => {
  test('accepts every value in the candidacy vocabulary', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    for (const candidacy of VALID_CANDIDACIES) {
      expect(() => db.jobStubs.setParsedCandidacy(sqlite, id, candidacy)).not.toThrow();
    }
  });

  test('rejects a value outside the candidacy vocabulary', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    expect(() => db.jobStubs.setParsedCandidacy(sqlite, id, 'Not A Real Value')).toThrow();
  });
});

describe('parsed_role_status CHECK constraint', () => {
  test('accepts every value in the role_status vocabulary', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    for (const status of VALID_STATUSES) {
      expect(() => db.jobStubs.setParsedRoleStatus(sqlite, id, status)).not.toThrow();
    }
  });

  test('rejects a value outside the role_status vocabulary', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    expect(() => db.jobStubs.setParsedRoleStatus(sqlite, id, 'Not A Real Value')).toThrow();
  });
});

describe('parsed_in_office_expectation CHECK constraint', () => {
  test('accepts every value in the in-office-expectation vocabulary', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    for (const option of VALID_IN_OFFICE_EXPECTATIONS) {
      expect(() => db.jobStubs.setParsedInOfficeExpectation(sqlite, id, option)).not.toThrow();
    }
  });

  test('rejects a value outside the in-office-expectation vocabulary', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    expect(() =>
      db.jobStubs.setParsedInOfficeExpectation(sqlite, id, 'Not A Real Value')
    ).toThrow();
  });
});

// ─── setParsedFields ────────────────────────────────────────────────

describe('setParsedFields', () => {
  test('writes all fields together in one call', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    db.jobStubs.setParsedFields(sqlite, id, {
      parsed_company: 'Acme',
      parsed_title: 'Eng',
      parsed_salary_min: 100000,
      parsed_location: 'Austin, TX',
    });

    const stub = db.jobStubs.getById(sqlite, id);
    expect(stub?.parsed_company).toBe('Acme');
    expect(stub?.parsed_title).toBe('Eng');
    expect(stub?.parsed_salary_min).toBe(100000);
    expect(stub?.parsed_location).toBe('Austin, TX');
    expect(stub?.parsed_description).toBeNull();
  });

  test('a second call fully replaces the previous values, not merges', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    db.jobStubs.setParsedFields(sqlite, id, { parsed_company: 'Acme', parsed_title: 'Eng' });

    db.jobStubs.setParsedFields(sqlite, id, { parsed_company: 'Only Company' });

    const stub = db.jobStubs.getById(sqlite, id);
    expect(stub?.parsed_company).toBe('Only Company');
    expect(stub?.parsed_title).toBeNull();
  });
});

// ─── deleteById ─────────────────────────────────────────────────────

describe('deleteById', () => {
  test('deletes the stub and returns one change', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    const result = db.jobStubs.deleteById(sqlite, id);
    expect(result.changes).toBe(1);
    expect(db.jobStubs.getById(sqlite, id)).toBeUndefined();
  });

  test('returns zero changes for a nonexistent id', () => {
    const result = db.jobStubs.deleteById(sqlite, 9999);
    expect(result.changes).toBe(0);
  });
});
