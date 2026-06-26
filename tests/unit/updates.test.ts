// tests/unit/updates.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import { validateUpdateInput, updateRole, UpdateRoleInput } from '../../lib/updates';
import { addRole } from '../../lib/roles';
import { RoleInput } from '../../lib/types';

let db: Database.Database;

const baseRole: RoleInput = {
  company: 'Acme/Turner & Sons',
  title: 'QA Engineer (III), Part II',
  url: 'https://example.com/job/1?i=2&ref=test',
  role_status: 'Pending Triage',
  jd: `This is a job description.
It has multiple lines.
And special characters: &, /, (, ), comma, "quotes", 'apostrophes'.
And a URL: https://example.com/job/1?i=2&ref=test.`,
};

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

// ─── validateUpdateInput ──────────────────────────────────────────────────────

describe('validateUpdateInput — required fields', () => {
  test('throws when id is NaN', () => {
    const input: UpdateRoleInput = { id: NaN, status: 'Applied', reasons: [], termination: [] };
    expect(() => validateUpdateInput(input)).toThrow('id must be a positive integer');
  });

  test('throws when id is zero', () => {
    const input: UpdateRoleInput = { id: 0, status: 'Applied', reasons: [], termination: [] };
    expect(() => validateUpdateInput(input)).toThrow('id must be a positive integer');
  });

  test('throws when id is negative', () => {
    const input: UpdateRoleInput = { id: -1, status: 'Applied', reasons: [], termination: [] };
    expect(() => validateUpdateInput(input)).toThrow('id must be a positive integer');
  });

  test('throws when status is empty string', () => {
    const input: UpdateRoleInput = { id: 1, status: '', reasons: [], termination: [] };
    expect(() => validateUpdateInput(input)).toThrow('status is required');
  });
});

describe('validateUpdateInput — vocabulary validation', () => {
  test('throws on invalid status', () => {
    const input: UpdateRoleInput = { id: 1, status: 'InvalidStatus', reasons: [], termination: [] };
    expect(() => validateUpdateInput(input)).toThrow('Invalid status: "InvalidStatus"');
  });

  test('throws on invalid skip reason', () => {
    const input: UpdateRoleInput = {
      id: 1,
      status: 'Skipped',
      reasons: ['InvalidReason'],
      termination: [],
    };
    expect(() => validateUpdateInput(input)).toThrow('Invalid skip reason: "InvalidReason"');
  });

  test('throws on invalid termination reason', () => {
    const input: UpdateRoleInput = {
      id: 1,
      status: 'Closed',
      reasons: [],
      termination: ['InvalidReason'],
    };
    expect(() => validateUpdateInput(input)).toThrow('Invalid termination reason: "InvalidReason"');
  });

  test('accepts all valid statuses', () => {
    const validStatuses = [
      'Resume Needed',
      'Resume Ready',
      'Applied',
      'Callback',
      'In Interview',
      'Offer Accepted',
      'Offer Declined',
      'On Hold',
      'Pending Triage',
    ];

    for (const status of validStatuses) {
      const input: UpdateRoleInput = { id: 1, status, reasons: [], termination: [] };
      expect(() => validateUpdateInput(input)).not.toThrow();
    }
  });
});

describe('validateUpdateInput — contextual rules', () => {
  test('throws when status is Skipped and reasons is empty', () => {
    const input: UpdateRoleInput = { id: 1, status: 'Skipped', reasons: [], termination: [] };
    expect(() => validateUpdateInput(input)).toThrow('reasons is required when status is Skipped');
  });

  test('throws when status is Closed and termination is empty', () => {
    const input: UpdateRoleInput = { id: 1, status: 'Closed', reasons: [], termination: [] };
    expect(() => validateUpdateInput(input)).toThrow(
      'termination is required when status is Closed'
    );
  });

  test('passes when status is Skipped and reasons is provided', () => {
    const input: UpdateRoleInput = {
      id: 1,
      status: 'Skipped',
      reasons: ['Location'],
      termination: [],
    };
    expect(() => validateUpdateInput(input)).not.toThrow();
  });

  test('passes when status is Closed and termination is provided', () => {
    const input: UpdateRoleInput = {
      id: 1,
      status: 'Closed',
      reasons: [],
      termination: ['Screened Out'],
    };
    expect(() => validateUpdateInput(input)).not.toThrow();
  });
});

// ─── updateRole ───────────────────────────────────────────────────────────────

describe('updateRole', () => {
  test('updates role_status correctly', () => {
    const id = addRole(db, baseRole);
    const input: UpdateRoleInput = { id, status: 'Applied', reasons: [], termination: [] };
    const role = updateRole(db, input);
    expect(role.role_status).toBe('Applied');
  });

  test('sets applied_date when transitioning to Applied and no date exists', () => {
    const id = addRole(db, baseRole);
    const input: UpdateRoleInput = { id, status: 'Applied', reasons: [], termination: [] };

    updateRole(db, input);

    const role = db.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.applied_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('preserves existing applied_date when transitioning to Applied', () => {
    const roleWithDate: RoleInput = { ...baseRole, applied_date: '2024-01-15' };
    const id = addRole(db, roleWithDate);
    const input: UpdateRoleInput = { id, status: 'Applied', reasons: [], termination: [] };

    updateRole(db, input);

    const role = db.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.applied_date).toBe('2024-01-15');
  });

  test('does not set applied_date when transitioning to a non-Applied status', () => {
    const id = addRole(db, baseRole);
    const input: UpdateRoleInput = { id, status: 'On Hold', reasons: [], termination: [] };

    updateRole(db, input);

    const role = db.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.applied_date).toBeNull();
  });

  test('inserts skip reasons correctly', () => {
    const id = addRole(db, baseRole);
    const input: UpdateRoleInput = {
      id,
      status: 'Skipped',
      reasons: ['Location', 'Compensation'],
      termination: [],
      note: 'Austin in-office; below floor',
    };

    updateRole(db, input);

    const reasons = db.prepare('SELECT * FROM skip_reasons WHERE role_id = ?').all(id) as Record<
      string,
      unknown
    >[];
    expect(reasons).toHaveLength(2);
    expect(reasons[0].reason).toBe('Location');
    expect(reasons[0].note).toBe('Austin in-office; below floor');
    expect(reasons[1].reason).toBe('Compensation');
  });

  test('inserts termination reasons correctly', () => {
    const id = addRole(db, baseRole);
    const input: UpdateRoleInput = {
      id,
      status: 'Closed',
      reasons: [],
      termination: ['Screened Out'],
    };

    updateRole(db, input);

    const reasons = db
      .prepare('SELECT * FROM termination_reasons WHERE role_id = ?')
      .all(id) as Record<string, unknown>[];
    expect(reasons).toHaveLength(1);
    expect(reasons[0].reason).toBe('Screened Out');
  });

  test('throws on invalid flags without touching DB', () => {
    const id = addRole(db, baseRole);
    const input: UpdateRoleInput = {
      id,
      status: 'InvalidStatus',
      reasons: [],
      termination: [],
    };

    expect(() => updateRole(db, input)).toThrow();

    const role = db.prepare('SELECT role_status FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.role_status).toBe('Pending Triage');
  });
});
