// tests/unit/roles.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import { addRole } from '../../lib/roles';
import { RoleInput } from '../../lib/types';

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

// ─── Valid insertion ───────────────────────────────────────────────────────────

describe('addRole — valid insertion', () => {
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

  test('returns a numeric ID on success', () => {
    const id = addRole(db, baseRole);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('inserts required fields accurately into the roles table', () => {
    const id = addRole(db, baseRole);
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;

    expect(role.company).toBe(baseRole.company);
    expect(role.title).toBe(baseRole.title);
    expect(role.url).toBe(baseRole.url);
    expect(role.role_status).toBe(baseRole.role_status);
  });

  test('inserts required fields accurately into the job_descriptions table', () => {
    const id = addRole(db, baseRole);
    const jd = db.prepare('SELECT * FROM job_descriptions WHERE role_id = ?').get(id) as Record<
      string,
      unknown
    >;

    expect(jd).not.toBeUndefined();
    expect(jd.content).toBe(baseRole.jd);
  });

  test('optional fields default to null when not provided', () => {
    const id = addRole(db, baseRole);
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;

    expect(role.candidacy).toBeNull();
    expect(role.applied_date).toBeNull();
    expect(role.salary_min).toBeNull();
    expect(role.salary_max).toBeNull();
    expect(role.notes).toBeNull();
  });

  test('inserts optional fields when provided', () => {
    const roleExtendedWithOptionalFields: RoleInput = {
      ...baseRole,
      candidacy: 'Competitive',
      applied_date: '2026-04-27',
      salary_min: 110000,
      salary_max: 130000,
      notes: 'Strong match.',
    };

    const id = addRole(db, roleExtendedWithOptionalFields);

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;

    expect(role.candidacy).toBe(roleExtendedWithOptionalFields.candidacy);
    expect(role.applied_date).toBe(roleExtendedWithOptionalFields.applied_date);
    expect(role.salary_min).toBe(roleExtendedWithOptionalFields.salary_min);
    expect(role.salary_max).toBe(roleExtendedWithOptionalFields.salary_max);
    expect(role.notes).toBe(roleExtendedWithOptionalFields.notes);
  });

  test('inserts skip reasons when role_status is Skipped', () => {
    const skipReason1 = 'Location';
    const skipReason1Note = 'Austin in-office';
    const skipReason2 = 'Compensation';
    const skipReason2Note = null;

    const roleExtendedWithFieldsForSkippedRoles: RoleInput = {
      ...baseRole,
      role_status: 'Skipped',
      skip_reasons: [
        { reason: skipReason1, note: skipReason1Note },
        { reason: skipReason2, note: skipReason2Note },
      ],
    };

    const id = addRole(db, roleExtendedWithFieldsForSkippedRoles);

    const reasons = db.prepare('SELECT * FROM skip_reasons WHERE role_id = ?').all(id) as Record<
      string,
      unknown
    >[];

    expect(reasons).toHaveLength(2);
    expect(reasons[0].reason).toBe(skipReason1);
    expect(reasons[0].note).toBe(skipReason1Note);
    expect(reasons[1].reason).toBe(skipReason2);
    expect(reasons[1].note).toBe(skipReason2Note);
  });

  test('inserts termination reasons when role_status is Closed', () => {
    const terminationReason1 = 'Screened Out';
    const terminationReason1Note = null;
    const terminationReason2 = 'Withdrew - Ethics - Exploitative Industry/Product';
    const terminationReason2Note = 'Payday lending';

    const roleExtendedWithFieldsForClosedRoles: RoleInput = {
      ...baseRole,
      role_status: 'Closed',
      termination_reasons: [
        { reason: terminationReason1, note: terminationReason1Note },
        { reason: terminationReason2, note: terminationReason2Note },
      ],
    };

    const id = addRole(db, roleExtendedWithFieldsForClosedRoles);

    const reasons = db
      .prepare('SELECT * FROM termination_reasons WHERE role_id = ?')
      .all(id) as Record<string, unknown>[];

    expect(reasons).toHaveLength(2);
    expect(reasons[0].reason).toBe(terminationReason1);
    expect(reasons[0].note).toBe(terminationReason1Note);
    expect(reasons[1].reason).toBe(terminationReason2);
    expect(reasons[1].note).toBe(terminationReason2Note);
  });

  test('inserts conditionally-required applied_date field for roles with Applied status', () => {
    const roleStatus = 'Applied';
    const appliedDate = '2026-04-27';
    const id = addRole(db, {
      ...baseRole,
      role_status: roleStatus,
      applied_date: appliedDate,
    });

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;
    expect(role.role_status).toBe(roleStatus);
    expect(role.applied_date).toBe(appliedDate);
  });
});

// ─── Required field validation ─────────────────────────────────────────────────

describe('addRole — required field validation', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  test('when required field company is missing, throw error and do not add role', () => {
    const role = { ...baseRole, company: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('company is required');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

  test('when required field title is missing, throw error and do not add role', () => {
    const role = { ...baseRole, title: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('title is required');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

  test('when required field url is missing, throw error and do not add role', () => {
    const role = { ...baseRole, url: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('url is required');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

  test('when required field role_status is missing, throw error and do not add role', () => {
    const role = { ...baseRole, role_status: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('role_status is required');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

  test('when required field jd is missing, throw error and do not add role or jd', () => {
    const role = { ...baseRole, jd: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('jd is required');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);

    const jds = db.prepare('SELECT * FROM job_descriptions').all();
    expect(jds).toHaveLength(0);
  });

  test('when required field company is an empty string, throw error and do not add role', () => {
    const role = { ...baseRole, company: '' } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('company is required');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

  test('when required field title is whitespace field, throw error and do not add role', () => {
    const role = { ...baseRole, title: '   ' } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('title is required');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

  test('when all fields are empty, throw error and do not add role', () => {
    expect(() => addRole(db, {} as unknown as RoleInput)).toThrow('Validation failed');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });
});

// ─── Contextual validation ─────────────────────────────────────────────────────

describe('addRole — contextual validation', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  test('when role_status is Applied and applied_date is missing, throw error and do not add role', () => {
    const role = { ...baseRole, role_status: 'Applied' } as RoleInput;
    expect(() => addRole(db, role)).toThrow('applied_date is required when role_status is Applied');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

  test('when role_status is Skipped and skip_reasons is null, throw error and do not add role or skip_reason', () => {
    const role = { ...baseRole, role_status: 'Skipped', skip_reasons: null } as RoleInput;
    expect(() => addRole(db, role)).toThrow('skip_reasons is required when role_status is Skipped');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);

    const skipReasons = db.prepare('SELECT * FROM skip_reasons').all();
    expect(skipReasons).toHaveLength(0);
  });

  test('when role_status is Skipped and skip_reasons is empty array, throw error and do not add role or skip_reason', () => {
    const role = { ...baseRole, role_status: 'Skipped', skip_reasons: [] } as RoleInput;
    expect(() => addRole(db, role)).toThrow('skip_reasons is required when role_status is Skipped');

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);

    const skipReasons = db.prepare('SELECT * FROM skip_reasons').all();
    expect(skipReasons).toHaveLength(0);
  });

  test('when role_status is Closed and termination_reasons is null, throw error and do not add role or termination_reason', () => {
    const role = { ...baseRole, role_status: 'Closed', termination_reasons: null } as RoleInput;
    expect(() => addRole(db, role)).toThrow(
      'termination_reasons is required when role_status is Closed'
    );

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);

    const terminationReasons = db.prepare('SELECT * FROM termination_reasons').all();
    expect(terminationReasons).toHaveLength(0);
  });

  test('when role_status is Closed and termination_reasons is empty array, throw error and do not add role or termination_reason', () => {
    const role = { ...baseRole, role_status: 'Closed', termination_reasons: [] } as RoleInput;
    expect(() => addRole(db, role)).toThrow(
      'termination_reasons is required when role_status is Closed'
    );

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);

    const terminationReasons = db.prepare('SELECT * FROM termination_reasons').all();
    expect(terminationReasons).toHaveLength(0);
  });
});

// ─── SQLite constraint violations ─────────────────────────────────────────────

describe('addRole — SQLite constraint violations', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  test('on invalid role_status value, throw error and do not add role', () => {
    const role = { ...baseRole, role_status: 'InvalidStatus' } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow();

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

  test('on invalid candidacy value, throw error and do not add role', () => {
    const role = { ...baseRole, candidacy: 'InvalidCandidacy' } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow();

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

  test('on invalid skip_reason value, throw error and do not add role or skip_reason', () => {
    const role: RoleInput = {
      ...baseRole,
      role_status: 'Skipped',
      skip_reasons: [{ reason: 'InvalidReason' as never, note: null }],
    };
    expect(() => addRole(db, role)).toThrow();

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);

    const skipReasons = db.prepare('SELECT * FROM skip_reasons').all();
    expect(skipReasons).toHaveLength(0);
  });

  test('on invalid termination_reason value, throw error and do not add role or skip_reason', () => {
    const role: RoleInput = {
      ...baseRole,
      role_status: 'Closed',
      termination_reasons: [{ reason: 'InvalidReason' as never, note: null }],
    };
    expect(() => addRole(db, role)).toThrow();

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);

    const terminationReasons = db.prepare('SELECT * FROM termination_reasons').all();
    expect(terminationReasons).toHaveLength(0);
  });
});
