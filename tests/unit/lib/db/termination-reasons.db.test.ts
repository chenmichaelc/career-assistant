// tests/unit/lib/db/termination-reasons.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../helpers/db';
import { insertRole } from '../../../../lib/db/roles.db';
import { db } from '../../../../lib/db';

let sqlite: Database.Database;

const baseRole = {
  company: 'Acme Corp',
  title: 'QA Engineer',
  url: 'https://example.com',
  role_status: 'Closed',
};

beforeEach(() => {
  sqlite = createTestDb();
});
afterEach(() => {
  sqlite.close();
});

// ─── insert ──────────────────────────────────────────────────

describe('insert', () => {
  test('inserts a termination reason and returns a numeric ID', () => {
    const roleId = insertRole(sqlite, baseRole);
    const id = db.terminationReasons.insert(sqlite, roleId, 'Screened Out', null);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('inserts with note when provided', () => {
    const terminationReason = 'Screened Out';
    const note = 'Failed technical screen';
    const roleId = insertRole(sqlite, baseRole);
    const id = db.terminationReasons.insert(sqlite, roleId, terminationReason, note);
    const reason = sqlite
      .prepare('SELECT * FROM termination_reasons WHERE id = ?')
      .get(id) as Record<string, unknown>;
    expect(reason.note).toBe(note);
  });

  test('inserts with null note when not provided', () => {
    const terminationReason = 'Screened Out';
    const note = null;
    const roleId = insertRole(sqlite, baseRole);
    const id = db.terminationReasons.insert(sqlite, roleId, terminationReason, note);
    const reason = sqlite
      .prepare('SELECT * FROM termination_reasons WHERE id = ?')
      .get(id) as Record<string, unknown>;
    expect(reason.note).toBe(note);
  });

  test('throws on invalid reason — CHECK constraint', () => {
    const invalidTerminationReason = 'Invalid Reason';
    const roleId = insertRole(sqlite, baseRole);
    expect(() =>
      db.terminationReasons.insert(sqlite, roleId, invalidTerminationReason, null)
    ).toThrow();
  });

  test('throws on non-existent role_id — FK constraint', () => {
    const invalidRoleId = 999;
    const terminationReason = 'Screened Out';
    expect(() =>
      db.terminationReasons.insert(sqlite, invalidRoleId, terminationReason, null)
    ).toThrow();
  });

  test('allows multiple termination reasons for the same role', () => {
    const terminationReason1 = 'Screened Out';
    const note1 = 'Note 1';
    const terminationReason2 = 'Filled';
    const note2 = 'Note 2';
    const terminationReason3 = 'Filled';
    const note3 = 'Note 3';
    const roleId = insertRole(sqlite, baseRole);
    db.terminationReasons.insert(sqlite, roleId, terminationReason1, note1);
    db.terminationReasons.insert(sqlite, roleId, terminationReason2, note2);
    db.terminationReasons.insert(sqlite, roleId, terminationReason3, note3);
    const reasons = db.terminationReasons.getAllByRoleId(sqlite, roleId);
    expect(reasons).toHaveLength(3);
    expect(reasons[0].reason).toBe(terminationReason1);
    expect(reasons[0].note).toBe(note1);
    expect(reasons[1].reason).toBe(terminationReason2);
    expect(reasons[1].note).toBe(note2);
    expect(reasons[2].reason).toBe(terminationReason3);
    expect(reasons[2].note).toBe(note3);
  });
});

// ─── getAllByRoleId ────────────────────────────────────────────

describe('getAllByRoleId', () => {
  test('returns all termination reasons for a role ordered by id ASC', () => {
    const terminationReason1 = 'Screened Out';
    const terminationReason2 = 'Filled';
    const terminationReason3 = 'Cancelled';
    const roleId = insertRole(sqlite, baseRole);
    db.terminationReasons.insert(sqlite, roleId, terminationReason1, null);
    db.terminationReasons.insert(sqlite, roleId, terminationReason2, null);
    db.terminationReasons.insert(sqlite, roleId, terminationReason3, null);
    const reasons = db.terminationReasons.getAllByRoleId(sqlite, roleId);
    expect(reasons).toHaveLength(3);
    expect(reasons[0].reason).toBe(terminationReason1);
    expect(reasons[1].reason).toBe(terminationReason2);
    expect(reasons[2].reason).toBe(terminationReason3);
  });

  test('returns empty array when no reasons exist', () => {
    const roleId = insertRole(sqlite, baseRole);
    const reasons = db.terminationReasons.getAllByRoleId(sqlite, roleId);
    expect(reasons).toHaveLength(0);
  });

  test('does not return reasons for other roles', () => {
    const terminationReason1 = 'Screened Out';
    const note1 = 'Note 1';
    const terminationReason2 = 'Filled';
    const note2 = 'Note 2';
    const terminationReason3 = 'Filled';
    const note3 = 'Note 3';
    const roleId1 = insertRole(sqlite, baseRole);
    const roleId2 = insertRole(sqlite, baseRole);
    const roleId3 = insertRole(sqlite, baseRole);
    db.terminationReasons.insert(sqlite, roleId1, terminationReason1, note1);
    db.terminationReasons.insert(sqlite, roleId2, terminationReason2, note2);
    db.terminationReasons.insert(sqlite, roleId3, terminationReason3, note3);
    const reasons = db.terminationReasons.getAllByRoleId(sqlite, roleId2);
    expect(reasons).toHaveLength(1);
    expect(reasons[0].reason).toBe(terminationReason2);
    expect(reasons[0].note).toBe(note2);
  });
});

// ─── getById ─────────────────────────────────────────────────

describe('getById', () => {
  test('returns termination reason when found', () => {
    const terminationReason = 'Screened Out';
    const note = 'Failed technical screen';
    const roleId = insertRole(sqlite, baseRole);
    const id = db.terminationReasons.insert(sqlite, roleId, terminationReason, note);
    const reason = db.terminationReasons.getById(sqlite, id);
    expect(reason).toBeDefined();
    expect(reason!.reason).toBe(terminationReason);
    expect(reason!.note).toBe(note);
    expect(reason!.role_id).toBe(roleId);
  });

  test('returns undefined when not found', () => {
    const reason = db.terminationReasons.getById(sqlite, 999);
    expect(reason).toBeUndefined();
  });

  test('does not return reasons for other roles', () => {
    const roleId1 = insertRole(sqlite, baseRole);
    const roleId2 = insertRole(sqlite, baseRole);
    db.terminationReasons.insert(sqlite, roleId1, 'Screened Out', null);
    const reasons = db.terminationReasons.getAllByRoleId(sqlite, roleId2);
    expect(reasons).toHaveLength(0);
  });
});

// ─── deleteById ──────────────────────────────────────────────

describe('deleteById', () => {
  test('deletes the termination reason and returns one change', () => {
    const terminationReason = 'Screened Out';
    const roleId = insertRole(sqlite, baseRole);
    const id = db.terminationReasons.insert(sqlite, roleId, terminationReason, null);
    const result = db.terminationReasons.deleteById(sqlite, id);
    expect(db.terminationReasons.getById(sqlite, id)).toBeUndefined();
    expect(result.changes).toBe(1);
  });

  test('does not affect other termination reasons for the same role', () => {
    const terminationReason1 = 'Screened Out';
    const terminationReason2 = 'Filled';
    const roleId = insertRole(sqlite, baseRole);
    const id1 = db.terminationReasons.insert(sqlite, roleId, terminationReason1, null);
    const id2 = db.terminationReasons.insert(sqlite, roleId, terminationReason2, null);
    db.terminationReasons.deleteById(sqlite, id1);
    expect(db.terminationReasons.getById(sqlite, id2)).toBeDefined();
  });

  test('safely makes no change when termination reason does not exist', () => {
    const result = db.terminationReasons.deleteById(sqlite, 999);
    expect(result.changes).toBe(0);
  });
});

// ─── deleteAllByRoleId ─────────────────────────────────────────

describe('deleteAllByRoleId', () => {
  test('deletes all termination reasons for a role and returns correct change count', () => {
    const terminationReason1 = 'Screened Out';
    const terminationReason2 = 'Filled';
    const roleId = insertRole(sqlite, baseRole);
    db.terminationReasons.insert(sqlite, roleId, terminationReason1, null);
    db.terminationReasons.insert(sqlite, roleId, terminationReason2, null);
    const result = db.terminationReasons.deleteAllByRoleId(sqlite, roleId);
    expect(db.terminationReasons.getAllByRoleId(sqlite, roleId)).toHaveLength(0);
    expect(result.changes).toBe(2);
  });

  test('does not affect termination reasons for other roles', () => {
    const terminationReason1 = 'Screened Out';
    const terminationReason2 = 'Filled';
    const roleId1 = insertRole(sqlite, baseRole);
    const roleId2 = insertRole(sqlite, baseRole);
    db.terminationReasons.insert(sqlite, roleId1, terminationReason1, null);
    db.terminationReasons.insert(sqlite, roleId2, terminationReason2, null);
    db.terminationReasons.deleteAllByRoleId(sqlite, roleId1);
    expect(db.terminationReasons.getAllByRoleId(sqlite, roleId2)).toHaveLength(1);
  });

  test('safely makes no change when no termination reasons exist for role', () => {
    const roleId = insertRole(sqlite, baseRole);
    const result = db.terminationReasons.deleteAllByRoleId(sqlite, roleId);
    expect(result.changes).toBe(0);
  });
});
