// tests/unit/updates.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import { validateUpdateFlags, fetchRoleOrThrow, updateRole } from '../../lib/updates';
import { UpdateArgs } from '../../lib/args/update-args';
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

// ─── validateUpdateFlags ──────────────────────────────────────────────────────

describe('validateUpdateFlags — required fields', () => {
  test('throws when id is missing', () => {
    const flags: UpdateArgs = { reasons: [], termination: [], status: 'Applied' };
    expect(() => validateUpdateFlags(flags)).toThrow('--id is required');
  });

  test('throws when id is empty string', () => {
    const flags: UpdateArgs = { id: '', reasons: [], termination: [], status: 'Applied' };
    expect(() => validateUpdateFlags(flags)).toThrow('--id is required');
  });

  test('throws when status is missing', () => {
    const flags: UpdateArgs = { id: '1', reasons: [], termination: [] };
    expect(() => validateUpdateFlags(flags)).toThrow('--status is required');
  });

  test('throws when status is empty string', () => {
    const flags: UpdateArgs = { id: '1', status: '', reasons: [], termination: [] };
    expect(() => validateUpdateFlags(flags)).toThrow('--status is required');
  });
});

describe('validateUpdateFlags — vocabulary validation', () => {
  test('throws on invalid status', () => {
    const flags: UpdateArgs = { id: '1', status: 'InvalidStatus', reasons: [], termination: [] };
    expect(() => validateUpdateFlags(flags)).toThrow('Invalid status: "InvalidStatus"');
  });

  test('throws on invalid skip reason', () => {
    const flags: UpdateArgs = {
      id: '1',
      status: 'Skipped',
      reasons: ['InvalidReason'],
      termination: [],
    };
    expect(() => validateUpdateFlags(flags)).toThrow('Invalid skip reason: "InvalidReason"');
  });

  test('throws on invalid termination reason', () => {
    const flags: UpdateArgs = {
      id: '1',
      status: 'Closed',
      reasons: [],
      termination: ['InvalidReason'],
    };
    expect(() => validateUpdateFlags(flags)).toThrow('Invalid termination reason: "InvalidReason"');
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
      const flags: UpdateArgs = { id: '1', status, reasons: [], termination: [] };
      expect(() => validateUpdateFlags(flags)).not.toThrow();
    }
  });
});

describe('validateUpdateFlags — contextual rules', () => {
  test('throws when status is Skipped and reasons is empty', () => {
    const flags: UpdateArgs = { id: '1', status: 'Skipped', reasons: [], termination: [] };
    expect(() => validateUpdateFlags(flags)).toThrow(
      '--reasons is required when status is Skipped'
    );
  });

  test('throws when status is Closed and termination is empty', () => {
    const flags: UpdateArgs = { id: '1', status: 'Closed', reasons: [], termination: [] };
    expect(() => validateUpdateFlags(flags)).toThrow(
      '--termination is required when status is Closed'
    );
  });

  test('passes when status is Skipped and reasons is provided', () => {
    const flags: UpdateArgs = {
      id: '1',
      status: 'Skipped',
      reasons: ['Location'],
      termination: [],
    };
    expect(() => validateUpdateFlags(flags)).not.toThrow();
  });

  test('passes when status is Closed and termination is provided', () => {
    const flags: UpdateArgs = {
      id: '1',
      status: 'Closed',
      reasons: [],
      termination: ['Screened Out'],
    };
    expect(() => validateUpdateFlags(flags)).not.toThrow();
  });
});

// ─── fetchRoleOrThrow ─────────────────────────────────────────────────────────

describe('fetchRoleOrThrow', () => {
  test('returns role when found', () => {
    const id = addRole(db, baseRole);
    const role = fetchRoleOrThrow(db, id);

    expect(role.company).toBe(baseRole.company);
    expect(role.title).toBe(baseRole.title);
  });

  test('throws when role not found', () => {
    expect(() => fetchRoleOrThrow(db, 999)).toThrow('No role found with ID 999');
  });
});

// ─── updateRole ───────────────────────────────────────────────────────────────

describe('updateRole', () => {
  test('updates role_status correctly', () => {
    const id = addRole(db, baseRole);
    const flags: UpdateArgs = { id: String(id), status: 'Applied', reasons: [], termination: [] };

    updateRole(db, flags);

    const role = db.prepare('SELECT role_status FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.role_status).toBe('Applied');
  });

  test('returns the pre-update role', () => {
    const id = addRole(db, baseRole);
    const flags: UpdateArgs = { id: String(id), status: 'Applied', reasons: [], termination: [] };

    const role = updateRole(db, flags);
    expect(role.role_status).toBe('Pending Triage');
  });

  test('sets applied_date when transitioning to Applied and no date exists', () => {
    const id = addRole(db, baseRole);
    const flags: UpdateArgs = { id: String(id), status: 'Applied', reasons: [], termination: [] };

    updateRole(db, flags);

    const role = db.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.applied_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('preserves existing applied_date when transitioning to Applied', () => {
    const roleWithDate: RoleInput = { ...baseRole, applied_date: '2024-01-15' };
    const id = addRole(db, roleWithDate);
    const flags: UpdateArgs = { id: String(id), status: 'Applied', reasons: [], termination: [] };

    updateRole(db, flags);

    const role = db.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.applied_date).toBe('2024-01-15');
  });

  test('does not set applied_date when transitioning to a non-Applied status', () => {
    const id = addRole(db, baseRole);
    const flags: UpdateArgs = { id: String(id), status: 'On Hold', reasons: [], termination: [] };

    updateRole(db, flags);

    const role = db.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.applied_date).toBeNull();
  });

  test('inserts skip reasons correctly', () => {
    const id = addRole(db, baseRole);
    const flags: UpdateArgs = {
      id: String(id),
      status: 'Skipped',
      reasons: ['Location', 'Compensation'],
      termination: [],
      note: 'Austin in-office; below floor',
    };

    updateRole(db, flags);

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
    const flags: UpdateArgs = {
      id: String(id),
      status: 'Closed',
      reasons: [],
      termination: ['Screened Out'],
    };

    updateRole(db, flags);

    const reasons = db
      .prepare('SELECT * FROM termination_reasons WHERE role_id = ?')
      .all(id) as Record<string, unknown>[];
    expect(reasons).toHaveLength(1);
    expect(reasons[0].reason).toBe('Screened Out');
  });

  test('throws on invalid flags without touching DB', () => {
    const id = addRole(db, baseRole);
    const flags: UpdateArgs = {
      id: String(id),
      status: 'InvalidStatus',
      reasons: [],
      termination: [],
    };

    expect(() => updateRole(db, flags)).toThrow();

    const role = db.prepare('SELECT role_status FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.role_status).toBe('Pending Triage');
  });
});
