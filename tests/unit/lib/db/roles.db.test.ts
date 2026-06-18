// tests/unit/lib/db/roles.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../helpers/db';
import {
  insertRole,
  getRoleById,
  updateRoleStatus,
  deleteRoleById,
  RoleInsertData,
} from '../../../../lib/db/roles.db';

let db: Database.Database;

const baseRole: RoleInsertData = {
  company: 'Acme Corp',
  title: 'QA Engineer',
  url: 'https://example.com/job/1',
  role_status: 'Pending Triage',
};

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  db.close();
});

// ─── insertRole ───────────────────────────────────────────────────────────────

describe('insertRole', () => {
  test('inserts a role and returns a numeric ID', () => {
    const id = insertRole(db, baseRole);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('inserted role is retrievable with correct values', () => {
    const id = insertRole(db, baseRole);
    const role = getRoleById(db, id);
    expect(role).toBeDefined();
    expect(role!.company).toBe(baseRole.company);
    expect(role!.title).toBe(baseRole.title);
    expect(role!.role_status).toBe(baseRole.role_status);
  });

  test('nulls optional fields when not provided', () => {
    const id = insertRole(db, baseRole);
    const role = getRoleById(db, id);
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

    const id = insertRole(db, {
      ...baseRole,
      candidacy,
      applied_date: appliedDate,
      salary_min: salaryMin,
      salary_max: salaryMax,
      notes,
    });
    const role = getRoleById(db, id);
    expect(role).toBeDefined();
    expect(role!.candidacy).toBe(candidacy);
    expect(role!.applied_date).toBe(appliedDate);
    expect(role!.salary_min).toBe(salaryMin);
    expect(role!.salary_max).toBe(salaryMax);
    expect(role!.notes).toBe(notes);
  });

  test('throws on invalid role_status — CHECK constraint', () => {
    expect(() => insertRole(db, { ...baseRole, role_status: 'InvalidStatus' })).toThrow(
      'CHECK constraint failed'
    );
  });

  test('throws on invalid candidacy — CHECK constraint', () => {
    expect(() => insertRole(db, { ...baseRole, candidacy: 'InvalidCandidacy' })).toThrow(
      'CHECK constraint failed'
    );
  });

  test('assigns incrementing IDs to successive inserts', () => {
    const id1 = insertRole(db, baseRole);
    const id2 = insertRole(db, baseRole);
    expect(id2).toBe(id1 + 1);
  });
});

// ─── getRoleById ──────────────────────────────────────────────────────────────

describe('getRoleById', () => {
  test('returns role when found', () => {
    const id = insertRole(db, baseRole);
    const role = getRoleById(db, id);
    expect(role).toBeDefined();
    expect(role!.id).toBe(id);
    expect(role!.company).toBe(baseRole.company);
  });

  test('returns undefined when not found', () => {
    const nonExistentId = 999;
    const role = getRoleById(db, nonExistentId);
    expect(role).toBeUndefined();
  });
});

// ─── updateRoleStatus ─────────────────────────────────────────────────────────

describe('updateRoleStatus', () => {
  test('updates role_status correctly and returns one change', () => {
    const newStatus = 'Applied';
    const id = insertRole(db, baseRole);
    const result = updateRoleStatus(db, id, newStatus);
    const role = getRoleById(db, id);
    expect(role!.role_status).toBe(newStatus);
    expect(result.changes).toBe(1);
  });

  test('sets applied_date when transitioning to Applied and no date exists', () => {
    const today = new Date().toISOString().split('T')[0];
    const id = insertRole(db, baseRole);
    updateRoleStatus(db, id, 'Applied');
    const role = getRoleById(db, id);
    expect(role!.applied_date).toBe(today);
  });

  test('preserves existing applied_date when transitioning to Applied', () => {
    const existingDate = '2024-01-15';
    const id = insertRole(db, { ...baseRole, applied_date: existingDate });
    updateRoleStatus(db, id, 'Applied');
    const role = getRoleById(db, id);
    expect(role!.applied_date).toBe(existingDate);
  });

  test('does not set applied_date when transitioning to non-Applied status', () => {
    const id = insertRole(db, baseRole);
    updateRoleStatus(db, id, 'On Hold');
    const role = getRoleById(db, id);
    expect(role!.applied_date).toBeNull();
  });

  test('throws on invalid status — CHECK constraint', () => {
    const id = insertRole(db, baseRole);
    expect(() => updateRoleStatus(db, id, 'InvalidStatus')).toThrow();
  });

  test('safely makes no change when role does not exist', () => {
    const nonExistentId = 999;
    const result = updateRoleStatus(db, nonExistentId, 'Applied');
    expect(result.changes).toBe(0);
  });
});

// ─── deleteRoleById ───────────────────────────────────────────────────────────

describe('deleteRoleById', () => {
  test('deletes the role and returns one change', () => {
    const id = insertRole(db, baseRole);
    const result = deleteRoleById(db, id);
    expect(getRoleById(db, id)).toBeUndefined();
    expect(result.changes).toBe(1);
  });

  test('throws on FK violation when job description exists', () => {
    const jobDescriptionContent = 'JD content';
    const id = insertRole(db, baseRole);
    db.prepare('INSERT INTO job_descriptions (role_id, content) VALUES (?, ?)').run(
      id,
      jobDescriptionContent
    );
    expect(() => deleteRoleById(db, id)).toThrow('FOREIGN KEY constraint failed');
  });

  test('throws on FK violation when skip reasons exist', () => {
    const skipReason = 'Location';
    const id = insertRole(db, baseRole);
    db.prepare('INSERT INTO skip_reasons (role_id, reason) VALUES (?, ?)').run(id, skipReason);
    expect(() => deleteRoleById(db, id)).toThrow('FOREIGN KEY constraint failed');
  });

  test('safely makes no change when role does not exist', () => {
    const nonExistentId = 999;
    const result = deleteRoleById(db, nonExistentId);
    expect(result.changes).toBe(0);
  });
});
