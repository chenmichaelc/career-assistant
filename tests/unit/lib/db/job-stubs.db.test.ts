// tests/unit/lib/db/job-stubs.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../helpers/db';
import { db } from '../../../../lib/db';

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

  test('defaults status to unscraped', () => {
    const id = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');
    const stub = db.jobStubs.getById(sqlite, id);
    expect(stub?.status).toBe('unscraped');
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
    expect(all.map((s) => s.id)).toEqual([secondId, firstId]);
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
    expect(matches.map((s) => s.url).sort()).toEqual([chromiumUrl, firefoxUrl].sort());
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
