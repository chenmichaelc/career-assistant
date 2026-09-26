// tests/unit/reasons.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import {
  addSkipReason,
  addTerminationReason,
  checkSkipReason,
  checkTerminationReason,
  RoleNotFoundError,
} from '../../lib/reasons';
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
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'A job description.',
    ...overrides,
  };
}

// ─── checkSkipReason ─────────────────────────────────────────────────────────

describe('checkSkipReason', () => {
  test('returns null for a valid reason', () => {
    expect(checkSkipReason('Location')).toBeNull();
  });

  test('returns an error message for an invalid reason', () => {
    const error = checkSkipReason('Not A Real Reason');
    expect(error).toContain('Invalid skip reason: "Not A Real Reason"');
  });

  test('trims before checking', () => {
    expect(checkSkipReason('  Location  ')).toBeNull();
  });
});

// ─── checkTerminationReason ───────────────────────────────────────────────────

describe('checkTerminationReason', () => {
  test('returns null for a valid reason', () => {
    expect(checkTerminationReason('Filled')).toBeNull();
  });

  test('returns an error message for an invalid reason', () => {
    const error = checkTerminationReason('Not A Real Reason');
    expect(error).toContain('Invalid termination reason: "Not A Real Reason"');
  });

  test('trims before checking', () => {
    expect(checkTerminationReason('  Filled  ')).toBeNull();
  });
});

// ─── addSkipReason ────────────────────────────────────────────────────────────

describe('addSkipReason', () => {
  test('inserts a skip reason and returns a numeric id', () => {
    const roleId = addRole(sqlite, makeRole());

    const newId = addSkipReason(sqlite, roleId, 'Location', 'Too far');

    expect(typeof newId).toBe('number');
    const stored = db.skipReasons.getById(sqlite, newId);
    expect(stored?.role_id).toBe(roleId);
    expect(stored?.reason).toBe('Location');
    expect(stored?.note).toBe('Too far');
  });

  test('rejects a reason not in the vocabulary, without inserting anything', () => {
    const roleId = addRole(sqlite, makeRole());

    expect(() => addSkipReason(sqlite, roleId, 'Not A Real Reason', null)).toThrow(
      'Invalid skip reason'
    );
    expect(db.skipReasons.getAllByRoleId(sqlite, roleId)).toHaveLength(0);
  });

  test('throws RoleNotFoundError for a nonexistent role, without inserting anything', () => {
    expect(() => addSkipReason(sqlite, 999, 'Location', null)).toThrow(RoleNotFoundError);
    expect(db.skipReasons.getAll(sqlite)).toHaveLength(0);
  });

  test('checks vocabulary before role existence', () => {
    expect(() => addSkipReason(sqlite, 999, 'Not A Real Reason', null)).not.toThrow(
      RoleNotFoundError
    );
  });
});

// ─── addTerminationReason ─────────────────────────────────────────────────────

describe('addTerminationReason', () => {
  test('inserts a termination reason and returns a numeric id', () => {
    const roleId = addRole(sqlite, makeRole());

    const newId = addTerminationReason(sqlite, roleId, 'Filled', null);

    expect(typeof newId).toBe('number');
    const stored = db.terminationReasons.getById(sqlite, newId);
    expect(stored?.role_id).toBe(roleId);
    expect(stored?.reason).toBe('Filled');
  });

  test('rejects a reason not in the vocabulary, without inserting anything', () => {
    const roleId = addRole(sqlite, makeRole());

    expect(() => addTerminationReason(sqlite, roleId, 'Not A Real Reason', null)).toThrow(
      'Invalid termination reason'
    );
    expect(db.terminationReasons.getAllByRoleId(sqlite, roleId)).toHaveLength(0);
  });

  test('throws RoleNotFoundError for a nonexistent role, without inserting anything', () => {
    expect(() => addTerminationReason(sqlite, 999, 'Filled', null)).toThrow(RoleNotFoundError);
    expect(db.terminationReasons.getAll(sqlite)).toHaveLength(0);
  });
});
