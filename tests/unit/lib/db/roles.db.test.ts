// tests/unit/lib/db/roles.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../helpers/db';
import { db, RoleInsertData } from '../../../../lib/db';

let sqlite: Database.Database;

const baseRole: RoleInsertData = {
  company: 'Acme Corp',
  title: 'QA Engineer',
  url: 'https://example.com/job/1',
  role_status: 'Pending Triage',
};

beforeEach(() => {
  sqlite = createTestDb();
});
afterEach(() => {
  sqlite.close();
});

// ─── insertRole ───────────────────────────────────────────────────────────────

describe('insertRole', () => {
  test('inserts a role and returns a numeric ID', () => {
    const id = db.roles.insertRole(sqlite, baseRole);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('inserted role is retrievable with correct values', () => {
    const id = db.roles.insertRole(sqlite, baseRole);
    const role = db.roles.getById(sqlite, id);
    expect(role).toBeDefined();
    expect(role!.company).toBe(baseRole.company);
    expect(role!.title).toBe(baseRole.title);
    expect(role!.role_status).toBe(baseRole.role_status);
  });

  test('nulls optional fields when not provided', () => {
    const id = db.roles.insertRole(sqlite, baseRole);
    const role = db.roles.getById(sqlite, id);
    expect(role).toBeDefined();
    expect(role!.candidacy).toBeNull();
    expect(role!.applied_date).toBeNull();
    expect(role!.salary_min).toBeNull();
    expect(role!.salary_max).toBeNull();
    expect(role!.notes).toBeNull();
  });

  test('stores optional fields when provided', () => {
    const candidacy = 'Competitive';
    const appliedDate = '2024-01-15';
    const salaryMin = 100000;
    const salaryMax = 130000;
    const notes = 'Sample note';

    const id = db.roles.insertRole(sqlite, {
      ...baseRole,
      candidacy,
      applied_date: appliedDate,
      salary_min: salaryMin,
      salary_max: salaryMax,
      notes,
    });
    const role = db.roles.getById(sqlite, id);
    expect(role).toBeDefined();
    expect(role!.candidacy).toBe(candidacy);
    expect(role!.applied_date).toBe(appliedDate);
    expect(role!.salary_min).toBe(salaryMin);
    expect(role!.salary_max).toBe(salaryMax);
    expect(role!.notes).toBe(notes);
  });

  test('throws on invalid role_status — CHECK constraint', () => {
    expect(() =>
      db.roles.insertRole(sqlite, { ...baseRole, role_status: 'InvalidStatus' })
    ).toThrow('CHECK constraint failed');
  });

  test('throws on invalid candidacy — CHECK constraint', () => {
    expect(() =>
      db.roles.insertRole(sqlite, { ...baseRole, candidacy: 'InvalidCandidacy' })
    ).toThrow('CHECK constraint failed');
  });

  test('assigns incrementing IDs to successive inserts', () => {
    const id1 = db.roles.insertRole(sqlite, baseRole);
    const id2 = db.roles.insertRole(sqlite, baseRole);
    expect(id2).toBe(id1 + 1);
  });
});

// ─── getById ──────────────────────────────────────────────────────────────

describe('getById', () => {
  test('returns role when found', () => {
    const id = db.roles.insertRole(sqlite, baseRole);
    const role = db.roles.getById(sqlite, id);
    expect(role).toBeDefined();
    expect(role!.id).toBe(id);
    expect(role!.company).toBe(baseRole.company);
  });

  test('returns undefined when not found', () => {
    const nonExistentId = 999;
    expect(db.roles.getById(sqlite, nonExistentId)).toBeUndefined();
  });
});

// ─── updateStatus ─────────────────────────────────────────────────────────

describe('updateStatus', () => {
  test('updates role_status correctly and returns one change', () => {
    const newStatus = 'Applied';
    const id = db.roles.insertRole(sqlite, baseRole);
    const result = db.roles.updateStatus(sqlite, id, newStatus);
    const role = db.roles.getById(sqlite, id);
    expect(role).toBeDefined();
    expect(role!.role_status).toBe(newStatus);
    expect(result.changes).toBe(1);
  });

  test('sets applied_date when transitioning to Applied and no date exists', () => {
    const today = new Date().toISOString().split('T')[0];
    const id = db.roles.insertRole(sqlite, baseRole);
    db.roles.updateStatus(sqlite, id, 'Applied');
    const role = db.roles.getById(sqlite, id);
    expect(role).toBeDefined();
    expect(role!.applied_date).toBe(today);
  });

  test('preserves existing applied_date when transitioning to Applied', () => {
    const existingDate = '2024-01-15';
    const id = db.roles.insertRole(sqlite, { ...baseRole, applied_date: existingDate });
    db.roles.updateStatus(sqlite, id, 'Applied');
    const role = db.roles.getById(sqlite, id);
    expect(role).toBeDefined();
    expect(role!.applied_date).toBe(existingDate);
  });

  test('does not set applied_date when transitioning to non-Applied status', () => {
    const id = db.roles.insertRole(sqlite, baseRole);
    db.roles.updateStatus(sqlite, id, 'On Hold');
    const role = db.roles.getById(sqlite, id);
    expect(role).toBeDefined();
    expect(role!.applied_date).toBeNull();
  });

  test('throws on invalid status — CHECK constraint', () => {
    const id = db.roles.insertRole(sqlite, baseRole);
    expect(() => db.roles.updateStatus(sqlite, id, 'InvalidStatus')).toThrow();
  });

  test('safely makes no change when role does not exist', () => {
    const nonExistentId = 999;
    const result = db.roles.updateStatus(sqlite, nonExistentId, 'Applied');
    expect(result.changes).toBe(0);
  });
});

// ─── deleteById ───────────────────────────────────────────────────────────

describe('deleteById', () => {
  test('deletes the role and returns one change', () => {
    const id = db.roles.insertRole(sqlite, baseRole);
    const result = db.roles.deleteById(sqlite, id);
    expect(db.roles.getById(sqlite, id)).toBeUndefined();
    expect(result.changes).toBe(1);
  });

  test('throws on FK violation when job description exists', () => {
    const jobDescriptionContent = 'JD content';
    const id = db.roles.insertRole(sqlite, baseRole);
    sqlite
      .prepare('INSERT INTO job_descriptions (role_id, content) VALUES (?, ?)')
      .run(id, jobDescriptionContent);
    expect(() => db.roles.deleteById(sqlite, id)).toThrow('FOREIGN KEY constraint failed');
  });

  test('throws on FK violation when skip reasons exist', () => {
    const skipReason = 'Location';
    const id = db.roles.insertRole(sqlite, baseRole);
    sqlite.prepare('INSERT INTO skip_reasons (role_id, reason) VALUES (?, ?)').run(id, skipReason);
    expect(() => db.roles.deleteById(sqlite, id)).toThrow('FOREIGN KEY constraint failed');
  });

  test('safely makes no change when role does not exist', () => {
    const nonExistentId = 999;
    const result = db.roles.deleteById(sqlite, nonExistentId);
    expect(result.changes).toBe(0);
  });
});
