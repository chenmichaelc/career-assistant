// tests/unit/roles.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import { addRole } from '../../lib/roles';
import { addStub } from '../../lib/job-stubs';
import { db } from '../../lib/db';
import { RoleInput } from '../../lib/types';

let sqlite: Database.Database;

beforeEach(() => {
  sqlite = createTestDb();
});

afterEach(() => {
  sqlite.close();
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
    const id = addRole(sqlite, baseRole);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('inserts required fields accurately into the roles table', () => {
    const id = addRole(sqlite, baseRole);
    const role = db.roles.getById(sqlite, id)!;

    expect(role.company).toBe(baseRole.company);
    expect(role.title).toBe(baseRole.title);
    expect(role.url).toBe(baseRole.url);
    expect(role.role_status).toBe(baseRole.role_status);
  });

  test('inserts required fields accurately into the job_descriptions table', () => {
    const id = addRole(sqlite, baseRole);
    const jd = db.jobDescriptions.getByRoleId(sqlite, id)!;

    expect(jd).not.toBeUndefined();
    expect(jd.content).toBe(baseRole.jd);
  });

  test('optional fields default to null when not provided', () => {
    const id = addRole(sqlite, baseRole);
    const role = db.roles.getById(sqlite, id)!;

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

    const id = addRole(sqlite, roleExtendedWithOptionalFields);

    const role = db.roles.getById(sqlite, id)!;

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

    const id = addRole(sqlite, roleExtendedWithFieldsForSkippedRoles);

    const reasons = db.skipReasons.getAllByRoleId(sqlite, id);

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

    const id = addRole(sqlite, roleExtendedWithFieldsForClosedRoles);

    const reasons = db.terminationReasons.getAllByRoleId(sqlite, id);

    expect(reasons).toHaveLength(2);
    expect(reasons[0].reason).toBe(terminationReason1);
    expect(reasons[0].note).toBe(terminationReason1Note);
    expect(reasons[1].reason).toBe(terminationReason2);
    expect(reasons[1].note).toBe(terminationReason2Note);
  });

  test('inserts conditionally-required applied_date field for roles with Applied status', () => {
    const roleStatus = 'Applied';
    const appliedDate = '2026-04-27';
    const id = addRole(sqlite, {
      ...baseRole,
      role_status: roleStatus,
      applied_date: appliedDate,
    });

    const role = db.roles.getById(sqlite, id)!;
    expect(role.role_status).toBe(roleStatus);
    expect(role.applied_date).toBe(appliedDate);
  });
});

// ─── Stub cleanup ──────────────────────────────────────────────────────────────

describe('addRole — stub cleanup', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  test('deletes the job stub queued for the same (cleansed) URL', () => {
    const stubId = addStub(sqlite, 'https://example.com/job/1?utm_source=linkedin');

    addRole(sqlite, baseRole);

    expect(db.jobStubs.getById(sqlite, stubId)).toBeUndefined();
  });

  test('matches the stub by cleansed URL even when the submitted URL is decorated differently', () => {
    const stubId = addStub(sqlite, 'https://example.com/job/1');

    addRole(sqlite, { ...baseRole, url: 'HTTP://Example.com/job/1/?utm_source=linkedin' });

    expect(db.jobStubs.getById(sqlite, stubId)).toBeUndefined();
  });

  test('leaves stubs for other URLs untouched', () => {
    const unrelatedStubId = addStub(sqlite, 'https://example.com/job/2');

    addRole(sqlite, baseRole);

    expect(db.jobStubs.getById(sqlite, unrelatedStubId)).toBeDefined();
  });

  test('succeeds normally when no stub matches the URL', () => {
    const id = addRole(sqlite, baseRole);
    expect(typeof id).toBe('number');
  });

  test('does not block role creation when the submitted URL is not a valid URL', () => {
    const id = addRole(sqlite, { ...baseRole, url: 'not a url' });

    const role = db.roles.getById(sqlite, id)!;
    expect(role.url).toBe('not a url');
  });

  test('a failed role creation leaves a matching stub intact (rollback)', () => {
    const stubId = addStub(sqlite, 'https://example.com/job/1');

    expect(() => addRole(sqlite, { ...baseRole, title: '' })).toThrow();

    expect(db.jobStubs.getById(sqlite, stubId)).toBeDefined();
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
    expect(() => addRole(sqlite, role)).toThrow('company is required');

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });

  test('when required field title is missing, throw error and do not add role', () => {
    const role = { ...baseRole, title: null } as unknown as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow('title is required');

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });

  test('when required field url is missing, throw error and do not add role', () => {
    const role = { ...baseRole, url: null } as unknown as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow('url is required');

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });

  test('when required field role_status is missing, throw error and do not add role', () => {
    const role = { ...baseRole, role_status: null } as unknown as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow('role_status is required');

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });

  test('when required field jd is missing, throw error and do not add role or jd', () => {
    const role = { ...baseRole, jd: null } as unknown as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow('jd is required');

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.jobDescriptions.getAll(sqlite)).toHaveLength(0);
  });

  test('when required field company is an empty string, throw error and do not add role', () => {
    const role = { ...baseRole, company: '' } as unknown as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow('company is required');

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });

  test('when required field title is whitespace field, throw error and do not add role', () => {
    const role = { ...baseRole, title: '   ' } as unknown as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow('title is required');

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });

  test('when all fields are empty, throw error and do not add role', () => {
    expect(() => addRole(sqlite, {} as unknown as RoleInput)).toThrow('Validation failed');

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
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
    expect(() => addRole(sqlite, role)).toThrow(
      'applied_date is required when role_status is Applied'
    );

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });

  test('when role_status is Skipped and skip_reasons is null, throw error and do not add role or skip_reason', () => {
    const role = { ...baseRole, role_status: 'Skipped', skip_reasons: null } as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow(
      'skip_reasons is required when role_status is Skipped'
    );

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.skipReasons.getAll(sqlite)).toHaveLength(0);
  });

  test('when role_status is Skipped and skip_reasons is empty array, throw error and do not add role or skip_reason', () => {
    const role = { ...baseRole, role_status: 'Skipped', skip_reasons: [] } as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow(
      'skip_reasons is required when role_status is Skipped'
    );

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.skipReasons.getAll(sqlite)).toHaveLength(0);
  });

  test('when role_status is Closed and termination_reasons is null, throw error and do not add role or termination_reason', () => {
    const role = { ...baseRole, role_status: 'Closed', termination_reasons: null } as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow(
      'termination_reasons is required when role_status is Closed'
    );

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.terminationReasons.getAll(sqlite)).toHaveLength(0);
  });

  test('when role_status is Closed and termination_reasons is empty array, throw error and do not add role or termination_reason', () => {
    const role = { ...baseRole, role_status: 'Closed', termination_reasons: [] } as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow(
      'termination_reasons is required when role_status is Closed'
    );

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.terminationReasons.getAll(sqlite)).toHaveLength(0);
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
    expect(() => addRole(sqlite, role)).toThrow();

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });

  test('on invalid candidacy value, throw error and do not add role', () => {
    const role = { ...baseRole, candidacy: 'InvalidCandidacy' } as unknown as RoleInput;
    expect(() => addRole(sqlite, role)).toThrow();

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });

  test('on invalid skip_reason value, throw error and do not add role or skip_reason', () => {
    const role: RoleInput = {
      ...baseRole,
      role_status: 'Skipped',
      skip_reasons: [{ reason: 'InvalidReason' as never, note: null }],
    };
    expect(() => addRole(sqlite, role)).toThrow();

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.skipReasons.getAll(sqlite)).toHaveLength(0);
  });

  test('on invalid termination_reason value, throw error and do not add role or skip_reason', () => {
    const role: RoleInput = {
      ...baseRole,
      role_status: 'Closed',
      termination_reasons: [{ reason: 'InvalidReason' as never, note: null }],
    };
    expect(() => addRole(sqlite, role)).toThrow();

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.terminationReasons.getAll(sqlite)).toHaveLength(0);
  });
});
