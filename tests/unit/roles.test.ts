// tests/unit/roles.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import {
  addRole,
  addSkipReason,
  addTerminationReason,
  checkSkipReason,
  checkTerminationReason,
  RoleNotFoundError,
  validateUpdateInput,
  updateRole,
  UpdateRoleInput,
  previewRoleDeletion,
  deleteRole,
  previewSkipReasonDeletion,
  deleteSkipReason,
  previewTerminationReasonDeletion,
  deleteTerminationReason,
  editSkipReason,
  editTerminationReason,
  SkipReasonNotFoundError,
  TerminationReasonNotFoundError,
} from '../../lib/roles';
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

// ─── Reason vocabulary validation ─────────────────────────────────────────────

describe('addRole — reason vocabulary validation', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Skipped',
    jd: 'This is a job description.',
  };

  test('rejects a skip_reasons entry not in the vocabulary, without adding anything', () => {
    const role = {
      ...baseRole,
      skip_reasons: [{ reason: 'Not A Real Reason', note: null }],
    } as unknown as RoleInput;

    expect(() => addRole(sqlite, role)).toThrow('Invalid skip reason: "Not A Real Reason"');
    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.skipReasons.getAll(sqlite)).toHaveLength(0);
  });

  test('rejects a termination_reasons entry not in the vocabulary, without adding anything', () => {
    const role = {
      ...baseRole,
      role_status: 'Closed',
      termination_reasons: [{ reason: 'Not A Real Reason', note: null }],
    } as unknown as RoleInput;

    expect(() => addRole(sqlite, role)).toThrow('Invalid termination reason: "Not A Real Reason"');
    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.terminationReasons.getAll(sqlite)).toHaveLength(0);
  });

  test('accepts valid skip_reasons entries', () => {
    const role = {
      ...baseRole,
      skip_reasons: [{ reason: 'Location', note: null }],
    } as RoleInput;

    const id = addRole(sqlite, role);
    expect(db.skipReasons.getAllByRoleId(sqlite, id)).toHaveLength(1);
  });

  test('rejects an invalid skip_reasons entry even when it is not the only one', () => {
    const role = {
      ...baseRole,
      skip_reasons: [
        { reason: 'Location', note: null },
        { reason: 'Not A Real Reason', note: null },
      ],
    } as unknown as RoleInput;

    expect(() => addRole(sqlite, role)).toThrow('Invalid skip reason: "Not A Real Reason"');
    expect(db.roles.getAll(sqlite)).toHaveLength(0);
    expect(db.skipReasons.getAll(sqlite)).toHaveLength(0);
  });

  test('rejects an invalid termination_reasons entry even when it is not the only one', () => {
    const role = {
      ...baseRole,
      role_status: 'Closed',
      termination_reasons: [
        { reason: 'Filled', note: null },
        { reason: 'Not A Real Reason', note: null },
      ],
    } as unknown as RoleInput;

    expect(() => addRole(sqlite, role)).toThrow('Invalid termination reason: "Not A Real Reason"');
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
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'A job description.',
  };

  test('inserts a skip reason and returns a numeric id', () => {
    const roleId = addRole(sqlite, baseRole);

    const newId = addSkipReason(sqlite, roleId, 'Location', 'Too far');

    expect(typeof newId).toBe('number');
    const stored = db.skipReasons.getById(sqlite, newId);
    expect(stored?.role_id).toBe(roleId);
    expect(stored?.reason).toBe('Location');
    expect(stored?.note).toBe('Too far');
  });

  test('rejects a reason not in the vocabulary, without inserting anything', () => {
    const roleId = addRole(sqlite, baseRole);

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
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'A job description.',
  };

  test('inserts a termination reason and returns a numeric id', () => {
    const roleId = addRole(sqlite, baseRole);

    const newId = addTerminationReason(sqlite, roleId, 'Filled', null);

    expect(typeof newId).toBe('number');
    const stored = db.terminationReasons.getById(sqlite, newId);
    expect(stored?.role_id).toBe(roleId);
    expect(stored?.reason).toBe('Filled');
  });

  test('rejects a reason not in the vocabulary, without inserting anything', () => {
    const roleId = addRole(sqlite, baseRole);

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

  test('updates role_status correctly', () => {
    const id = addRole(sqlite, baseRole);
    const input: UpdateRoleInput = { id, status: 'Applied', reasons: [], termination: [] };
    const role = updateRole(sqlite, input);
    expect(role.role_status).toBe('Applied');
  });

  test('sets applied_date when transitioning to Applied and no date exists', () => {
    const id = addRole(sqlite, baseRole);
    const input: UpdateRoleInput = { id, status: 'Applied', reasons: [], termination: [] };

    updateRole(sqlite, input);

    const role = sqlite.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.applied_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('preserves existing applied_date when transitioning to Applied', () => {
    const roleWithDate: RoleInput = { ...baseRole, applied_date: '2024-01-15' };
    const id = addRole(sqlite, roleWithDate);
    const input: UpdateRoleInput = { id, status: 'Applied', reasons: [], termination: [] };

    updateRole(sqlite, input);

    const role = sqlite.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.applied_date).toBe('2024-01-15');
  });

  test('does not set applied_date when transitioning to a non-Applied status', () => {
    const id = addRole(sqlite, baseRole);
    const input: UpdateRoleInput = { id, status: 'On Hold', reasons: [], termination: [] };

    updateRole(sqlite, input);

    const role = sqlite.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.applied_date).toBeNull();
  });

  test('inserts skip reasons correctly', () => {
    const id = addRole(sqlite, baseRole);
    const input: UpdateRoleInput = {
      id,
      status: 'Skipped',
      reasons: ['Location', 'Compensation'],
      termination: [],
      note: 'Austin in-office; below floor',
    };

    updateRole(sqlite, input);

    const reasons = sqlite
      .prepare('SELECT * FROM skip_reasons WHERE role_id = ?')
      .all(id) as Record<string, unknown>[];
    expect(reasons).toHaveLength(2);
    expect(reasons[0].reason).toBe('Location');
    expect(reasons[0].note).toBe('Austin in-office; below floor');
    expect(reasons[1].reason).toBe('Compensation');
  });

  test('inserts termination reasons correctly', () => {
    const id = addRole(sqlite, baseRole);
    const input: UpdateRoleInput = {
      id,
      status: 'Closed',
      reasons: [],
      termination: ['Screened Out'],
    };

    updateRole(sqlite, input);

    const reasons = sqlite
      .prepare('SELECT * FROM termination_reasons WHERE role_id = ?')
      .all(id) as Record<string, unknown>[];
    expect(reasons).toHaveLength(1);
    expect(reasons[0].reason).toBe('Screened Out');
  });

  test('throws on invalid flags without touching DB', () => {
    const id = addRole(sqlite, baseRole);
    const input: UpdateRoleInput = {
      id,
      status: 'InvalidStatus',
      reasons: [],
      termination: [],
    };

    expect(() => updateRole(sqlite, input)).toThrow();

    const role = sqlite.prepare('SELECT role_status FROM roles WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    expect(role.role_status).toBe('Pending Triage');
  });
});

// ─── previewRoleDeletion ──────────────────────────────────────────────────────

describe('previewRoleDeletion', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  const skippedRole: RoleInput = {
    ...baseRole,
    role_status: 'Skipped',
    skip_reasons: [{ reason: 'Location', note: 'Austin in-office' }],
  };

  const closedRole: RoleInput = {
    ...baseRole,
    role_status: 'Closed',
    termination_reasons: [{ reason: 'Screened Out', note: null }],
  };

  test('returns role details', () => {
    const id = addRole(sqlite, baseRole);
    const preview = previewRoleDeletion(sqlite, id);

    expect(preview.role.company).toBe(baseRole.company);
    expect(preview.role.title).toBe(baseRole.title);
  });

  test('returns empty dependent arrays for clean role', () => {
    const id = addRole(sqlite, baseRole);
    const preview = previewRoleDeletion(sqlite, id);

    expect(preview.skip_reasons).toHaveLength(0);
    expect(preview.termination_reasons).toHaveLength(0);
    expect(preview.job_descriptions).toHaveLength(1);
  });

  test('returns skip reasons for skipped role', () => {
    const id = addRole(sqlite, skippedRole);
    const preview = previewRoleDeletion(sqlite, id);

    expect(preview.skip_reasons).toHaveLength(1);
    expect(preview.skip_reasons[0].reason).toBe('Location');
  });

  test('returns termination reasons for closed role', () => {
    const id = addRole(sqlite, closedRole);
    const preview = previewRoleDeletion(sqlite, id);

    expect(preview.termination_reasons).toHaveLength(1);
    expect(preview.termination_reasons[0].reason).toBe('Screened Out');
  });

  test('throws when role not found', () => {
    expect(() => previewRoleDeletion(sqlite, 999)).toThrow('No role found with ID 999');
  });
});

// ─── deleteRole ───────────────────────────────────────────────────────────────

describe('deleteRole', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  const skippedRole: RoleInput = {
    ...baseRole,
    role_status: 'Skipped',
    skip_reasons: [{ reason: 'Location', note: 'Austin in-office' }],
  };

  test('deletes a role with no dependents', () => {
    const id = addRole(sqlite, baseRole);

    // Delete JD first so role has no dependents
    sqlite.prepare('DELETE FROM job_descriptions WHERE role_id = ?').run(id);
    deleteRole(sqlite, id, false);

    const role = sqlite.prepare('SELECT * FROM roles WHERE id = ?').get(id);
    expect(role).toBeUndefined();
  });

  test('refuses to delete role with dependents in normal mode', () => {
    const id = addRole(sqlite, skippedRole);
    expect(() => deleteRole(sqlite, id, false)).toThrow('has dependent records');
  });

  test('role remains intact after refused deletion', () => {
    const id = addRole(sqlite, skippedRole);
    expect(() => deleteRole(sqlite, id, false)).toThrow(/has dependent records/);
  });

  test('force deletes role and all dependents', () => {
    const id = addRole(sqlite, skippedRole);
    deleteRole(sqlite, id, true);

    const role = sqlite.prepare('SELECT * FROM roles WHERE id = ?').get(id);
    const skipReasons = sqlite.prepare('SELECT * FROM skip_reasons WHERE role_id = ?').all(id);
    const jds = sqlite.prepare('SELECT * FROM job_descriptions WHERE role_id = ?').all(id);

    expect(role).toBeUndefined();
    expect(skipReasons).toHaveLength(0);
    expect(jds).toHaveLength(0);
  });

  test('throws when role not found', () => {
    expect(() => deleteRole(sqlite, 999, false)).toThrow('No role found with ID 999');
  });

  test('returns pre-deletion role details', () => {
    const id = addRole(sqlite, baseRole);
    sqlite.prepare('DELETE FROM job_descriptions WHERE role_id = ?').run(id);

    const result = deleteRole(sqlite, id, false);
    expect(result.role.company).toBe(baseRole.company);
  });
});

// ─── previewSkipReasonDeletion ────────────────────────────────────────────────

describe('previewSkipReasonDeletion', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  const skippedRole: RoleInput = {
    ...baseRole,
    role_status: 'Skipped',
    skip_reasons: [{ reason: 'Location', note: 'Austin in-office' }],
  };

  test('returns skip reason and parent role', () => {
    const roleId = addRole(sqlite, skippedRole);
    const skipReasonRow = sqlite
      .prepare('SELECT * FROM skip_reasons WHERE role_id = ?')
      .get(roleId) as { id: number };

    const preview = previewSkipReasonDeletion(sqlite, skipReasonRow.id);

    expect(preview.reason.reason).toBe('Location');
    expect(preview.role.id).toBe(roleId);
    expect(preview.role.company).toBe(baseRole.company);
  });

  test('throws when skip reason not found', () => {
    expect(() => previewSkipReasonDeletion(sqlite, 999)).toThrow(
      'No skip reason found with ID 999'
    );
  });
});

// ─── deleteSkipReason ─────────────────────────────────────────────────────────

describe('deleteSkipReason', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  const skippedRole: RoleInput = {
    ...baseRole,
    role_status: 'Skipped',
    skip_reasons: [{ reason: 'Location', note: 'Austin in-office' }],
  };

  test('deletes skip reason by id', () => {
    const roleId = addRole(sqlite, skippedRole);
    const skipReasonRow = sqlite
      .prepare('SELECT * FROM skip_reasons WHERE role_id = ?')
      .get(roleId) as { id: number };

    deleteSkipReason(sqlite, skipReasonRow.id);

    const result = sqlite.prepare('SELECT * FROM skip_reasons WHERE id = ?').get(skipReasonRow.id);
    expect(result).toBeUndefined();
  });

  test('returns deleted reason and parent role', () => {
    const roleId = addRole(sqlite, skippedRole);
    const skipReasonRow = sqlite
      .prepare('SELECT * FROM skip_reasons WHERE role_id = ?')
      .get(roleId) as { id: number };

    const result = deleteSkipReason(sqlite, skipReasonRow.id);

    expect(result.reason.reason).toBe('Location');
    expect(result.role.company).toBe(baseRole.company);
  });

  test('throws when skip reason not found', () => {
    expect(() => deleteSkipReason(sqlite, 999)).toThrow('No skip reason found with ID 999');
  });
});

// ─── previewTerminationReasonDeletion ─────────────────────────────────────────

describe('previewTerminationReasonDeletion', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  const closedRole: RoleInput = {
    ...baseRole,
    role_status: 'Closed',
    termination_reasons: [{ reason: 'Screened Out', note: null }],
  };

  test('returns termination reason and parent role', () => {
    const roleId = addRole(sqlite, closedRole);
    const terminationReasonRow = sqlite
      .prepare('SELECT * FROM termination_reasons WHERE role_id = ?')
      .get(roleId) as { id: number };

    const preview = previewTerminationReasonDeletion(sqlite, terminationReasonRow.id);

    expect(preview.reason.reason).toBe('Screened Out');
    expect(preview.role.id).toBe(roleId);
  });

  test('throws when termination reason not found', () => {
    expect(() => previewTerminationReasonDeletion(sqlite, 999)).toThrow(
      'No termination reason found with ID 999'
    );
  });
});

// ─── deleteTerminationReason ──────────────────────────────────────────────────

describe('deleteTerminationReason', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'This is a job description.',
  };

  const closedRole: RoleInput = {
    ...baseRole,
    role_status: 'Closed',
    termination_reasons: [{ reason: 'Screened Out', note: null }],
  };

  test('deletes termination reason by id', () => {
    const roleId = addRole(sqlite, closedRole);
    const terminationReasonRow = sqlite
      .prepare('SELECT * FROM termination_reasons WHERE role_id = ?')
      .get(roleId) as { id: number };

    deleteTerminationReason(sqlite, terminationReasonRow.id);

    const result = sqlite
      .prepare('SELECT * FROM termination_reasons WHERE id = ?')
      .get(terminationReasonRow.id);
    expect(result).toBeUndefined();
  });

  test('returns deleted reason and parent role', () => {
    const roleId = addRole(sqlite, closedRole);
    const terminationReasonRow = sqlite
      .prepare('SELECT * FROM termination_reasons WHERE role_id = ?')
      .get(roleId) as { id: number };

    const result = deleteTerminationReason(sqlite, terminationReasonRow.id);

    expect(result.reason.reason).toBe('Screened Out');
    expect(result.role.company).toBe(baseRole.company);
  });

  test('throws when termination reason not found', () => {
    expect(() => deleteTerminationReason(sqlite, 999)).toThrow(
      'No termination reason found with ID 999'
    );
  });
});

// ─── editSkipReason ───────────────────────────────────────────────────────────

describe('editSkipReason', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Skipped',
    jd: 'This is a job description.',
    skip_reasons: [{ reason: 'Location', note: 'Austin in-office' }],
  };

  test('updates the reason and note, and returns the updated row', () => {
    const roleId = addRole(sqlite, baseRole);
    const [skipReasonRow] = db.skipReasons.getAllByRoleId(sqlite, roleId);

    const updatedSkipReason = editSkipReason(
      sqlite,
      skipReasonRow.id,
      'Compensation',
      'Below floor'
    );

    expect(updatedSkipReason.reason).toBe('Compensation');
    expect(updatedSkipReason.note).toBe('Below floor');

    const storedSkipReason = db.skipReasons.getById(sqlite, skipReasonRow.id);
    expect(storedSkipReason?.reason).toBe('Compensation');
    expect(storedSkipReason?.note).toBe('Below floor');
  });

  test('rejects a reason not in the vocabulary, without updating anything', () => {
    const roleId = addRole(sqlite, baseRole);
    const [skipReasonRow] = db.skipReasons.getAllByRoleId(sqlite, roleId);

    expect(() => editSkipReason(sqlite, skipReasonRow.id, 'Not A Real Reason', null)).toThrow(
      'Invalid skip reason'
    );

    const storedSkipReason = db.skipReasons.getById(sqlite, skipReasonRow.id);
    expect(storedSkipReason?.reason).toBe('Location');
  });

  test('throws SkipReasonNotFoundError for a nonexistent skip reason, without updating anything', () => {
    expect(() => editSkipReason(sqlite, 999, 'Location', null)).toThrow(SkipReasonNotFoundError);
  });

  test('checks vocabulary before existence', () => {
    expect(() => editSkipReason(sqlite, 999, 'Not A Real Reason', null)).not.toThrow(
      SkipReasonNotFoundError
    );
  });
});

// ─── editTerminationReason ────────────────────────────────────────────────────

describe('editTerminationReason', () => {
  const baseRole: RoleInput = {
    company: 'Acme',
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Closed',
    jd: 'This is a job description.',
    termination_reasons: [{ reason: 'Filled', note: null }],
  };

  test('updates the reason and note, and returns the updated row', () => {
    const roleId = addRole(sqlite, baseRole);
    const [terminationReasonRow] = db.terminationReasons.getAllByRoleId(sqlite, roleId);

    const updatedTerminationReason = editTerminationReason(
      sqlite,
      terminationReasonRow.id,
      'Screened Out',
      'Recruiter feedback'
    );

    expect(updatedTerminationReason.reason).toBe('Screened Out');
    expect(updatedTerminationReason.note).toBe('Recruiter feedback');

    const storedTerminationReason = db.terminationReasons.getById(sqlite, terminationReasonRow.id);
    expect(storedTerminationReason?.reason).toBe('Screened Out');
    expect(storedTerminationReason?.note).toBe('Recruiter feedback');
  });

  test('rejects a reason not in the vocabulary, without updating anything', () => {
    const roleId = addRole(sqlite, baseRole);
    const [terminationReasonRow] = db.terminationReasons.getAllByRoleId(sqlite, roleId);

    expect(() =>
      editTerminationReason(sqlite, terminationReasonRow.id, 'Not A Real Reason', null)
    ).toThrow('Invalid termination reason');

    const storedTerminationReason = db.terminationReasons.getById(sqlite, terminationReasonRow.id);
    expect(storedTerminationReason?.reason).toBe('Filled');
  });

  test('throws TerminationReasonNotFoundError for a nonexistent termination reason, without updating anything', () => {
    expect(() => editTerminationReason(sqlite, 999, 'Filled', null)).toThrow(
      TerminationReasonNotFoundError
    );
  });

  test('checks vocabulary before existence', () => {
    expect(() => editTerminationReason(sqlite, 999, 'Not A Real Reason', null)).not.toThrow(
      TerminationReasonNotFoundError
    );
  });
});
