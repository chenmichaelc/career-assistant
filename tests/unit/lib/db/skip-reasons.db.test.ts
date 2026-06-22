// tests/unit/lib/db/skip-reasons.db.test.ts
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
  role_status: 'Skipped',
};

beforeEach(() => {
  sqlite = createTestDb();
});
afterEach(() => {
  sqlite.close();
});

// ─── insert ─────────────────────────────────────────────────────────

describe('insertS', () => {
  test('inserts a skip reason and returns a numeric ID', () => {
    const roleId = insertRole(sqlite, baseRole);
    const id = db.skipReasons.insert(sqlite, roleId, 'Location', null);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('inserts with note when provided', () => {
    const note = 'Austin in-office';
    const roleId = insertRole(sqlite, baseRole);
    const id = db.skipReasons.insert(sqlite, roleId, 'Location', note);
    const reason = sqlite.prepare('SELECT * FROM skip_reasons WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(reason.note).toBe(note);
  });

  test('inserts with null note when not provided', () => {
    const roleId = insertRole(sqlite, baseRole);
    const id = db.skipReasons.insert(sqlite, roleId, 'Location', null);
    const reason = sqlite.prepare('SELECT * FROM skip_reasons WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(reason.note).toBeNull();
  });

  test('throws on invalid reason — CHECK constraint', () => {
    const roleId = insertRole(sqlite, baseRole);
    expect(() => db.skipReasons.insert(sqlite, roleId, 'InvalidReason', null)).toThrow();
  });

  test('throws on non-existent role_id — FK constraint', () => {
    expect(() => db.skipReasons.insert(sqlite, 999, 'Location', null)).toThrow();
  });

  test('allows multiple skip reasons for the same role', () => {
    const roleId = insertRole(sqlite, baseRole);
    db.skipReasons.insert(sqlite, roleId, 'Location', null);
    db.skipReasons.insert(sqlite, roleId, 'Compensation', null);
    const reasons = db.skipReasons.getAllByRoleId(sqlite, roleId);
    expect(reasons).toHaveLength(2);
  });
});

// ─── getAllByRoleId ───────────────────────────────────────────────────

describe('getAllByRoleId', () => {
  test('returns all skip reasons for a role ordered by id ASC', () => {
    const roleId = insertRole(sqlite, baseRole);
    db.skipReasons.insert(sqlite, roleId, 'Location', null);
    db.skipReasons.insert(sqlite, roleId, 'Compensation', null);
    db.skipReasons.insert(sqlite, roleId, 'Culture', null);
    const reasons = db.skipReasons.getAllByRoleId(sqlite, roleId);
    expect(reasons).toHaveLength(3);
    expect(reasons[0].reason).toBe('Location');
    expect(reasons[1].reason).toBe('Compensation');
    expect(reasons[2].reason).toBe('Culture');
  });

  test('returns empty array when no reasons exist', () => {
    const roleId = insertRole(sqlite, baseRole);
    const reasons = db.skipReasons.getAllByRoleId(sqlite, roleId);
    expect(reasons).toHaveLength(0);
  });

  test('does not return reasons for other roles', () => {
    const roleId1 = insertRole(sqlite, baseRole);
    const roleId2 = insertRole(sqlite, baseRole);
    db.skipReasons.insert(sqlite, roleId1, 'Location', null);
    const reasons = db.skipReasons.getAllByRoleId(sqlite, roleId2);
    expect(reasons).toHaveLength(0);
  });
});

// ─── getById ────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns skip reason when found', () => {
    const note = 'Austin in-office';
    const roleId = insertRole(sqlite, baseRole);
    const id = db.skipReasons.insert(sqlite, roleId, 'Location', note);
    const reason = db.skipReasons.getById(sqlite, id);
    expect(reason).toBeDefined();
    expect(reason!.reason).toBe('Location');
    expect(reason!.note).toBe(note);
    expect(reason!.role_id).toBe(roleId);
  });

  test('returns undefined when not found', () => {
    const reason = db.skipReasons.getById(sqlite, 999);
    expect(reason).toBeUndefined();
  });
});

// ─── deleteById ─────────────────────────────────────────────────────

describe('deleteById', () => {
  test('deletes the skip reason and returns one change', () => {
    const roleId = insertRole(sqlite, baseRole);
    const id = db.skipReasons.insert(sqlite, roleId, 'Location', null);
    const result = db.skipReasons.deleteById(sqlite, id);
    expect(db.skipReasons.getById(sqlite, id)).toBeUndefined();
    expect(result.changes).toBe(1);
  });

  test('does not affect other skip reasons for the same role', () => {
    const roleId = insertRole(sqlite, baseRole);
    const id1 = db.skipReasons.insert(sqlite, roleId, 'Location', null);
    const id2 = db.skipReasons.insert(sqlite, roleId, 'Compensation', null);
    db.skipReasons.deleteById(sqlite, id1);
    expect(db.skipReasons.getById(sqlite, id2)).toBeDefined();
  });

  test('safely makes no change when skip reason does not exist', () => {
    const result = db.skipReasons.deleteById(sqlite, 999);
    expect(result.changes).toBe(0);
  });
});

// ─── deleteAllByRoleId ────────────────────────────────────────────────

describe('deleteAllByRoleId', () => {
  test('deletes all skip reasons for a role and returns correct change count', () => {
    const roleId = insertRole(sqlite, baseRole);
    db.skipReasons.insert(sqlite, roleId, 'Location', null);
    db.skipReasons.insert(sqlite, roleId, 'Compensation', null);
    const result = db.skipReasons.deleteAllByRoleId(sqlite, roleId);
    expect(db.skipReasons.getAllByRoleId(sqlite, roleId)).toHaveLength(0);
    expect(result.changes).toBe(2);
  });

  test('does not affect skip reasons for other roles', () => {
    const roleId1 = insertRole(sqlite, baseRole);
    const roleId2 = insertRole(sqlite, baseRole);
    db.skipReasons.insert(sqlite, roleId1, 'Location', null);
    db.skipReasons.insert(sqlite, roleId2, 'Compensation', null);
    db.skipReasons.deleteAllByRoleId(sqlite, roleId1);
    expect(db.skipReasons.getAllByRoleId(sqlite, roleId2)).toHaveLength(1);
  });

  test('safely makes no change when no skip reasons exist for role', () => {
    const roleId = insertRole(sqlite, baseRole);
    const result = db.skipReasons.deleteAllByRoleId(sqlite, roleId);
    expect(result.changes).toBe(0);
  });
});
