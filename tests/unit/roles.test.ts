// tests/unit/roles.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database          from 'better-sqlite3';
import { createTestDb }  from '../helpers/db';
import { addRole }       from '../../lib/roles';
import { RoleInput }     from '../../lib/types';

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
    company:     'Acme',
    title:       'QA Engineer',
    url:         'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd:          'This is a job description.',
  };

  test('returns a numeric ID on success', () => {
    const id = addRole(db, baseRole);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('inserts role into roles table', () => {
    const id   = addRole(db, baseRole);
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;

    expect(role.company).toBe('Acme');
    expect(role.title).toBe('QA Engineer');
    expect(role.url).toBe('https://example.com/job/1');
    expect(role.role_status).toBe('Pending Triage');
  });

  test('inserts JD into job_descriptions table', () => {
    const id = addRole(db, baseRole);
    const jd = db.prepare('SELECT * FROM job_descriptions WHERE role_id = ?').get(id) as Record<string, unknown>;

    expect(jd).not.toBeUndefined();
    expect(jd.content).toBe('This is a job description.');
  });

  test('optional fields default to null when not provided', () => {
    const id   = addRole(db, baseRole);
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;

    expect(role.candidacy).toBeNull();
    expect(role.applied_date).toBeNull();
    expect(role.salary_min).toBeNull();
    expect(role.salary_max).toBeNull();
    expect(role.notes).toBeNull();
  });

  test('inserts optional fields when provided', () => {
    const id = addRole(db, {
      ...baseRole,
      candidacy:    'Competitive',
      applied_date: '2026-04-27',
      salary_min:   110000,
      salary_max:   130000,
      notes:        'Strong match.',
    });

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;

    expect(role.candidacy).toBe('Competitive');
    expect(role.applied_date).toBe('2026-04-27');
    expect(role.salary_min).toBe(110000);
    expect(role.salary_max).toBe(130000);
    expect(role.notes).toBe('Strong match.');
  });

  test('inserts skip reasons when role_status is Skipped', () => {
    const id = addRole(db, {
      ...baseRole,
      role_status:  'Skipped',
      skip_reasons: [
        { reason: 'Location', note: 'Austin in-office' },
        { reason: 'Compensation', note: null },
      ],
    });

    const reasons = db.prepare('SELECT * FROM skip_reasons WHERE role_id = ?').all(id) as Record<string, unknown>[];

    expect(reasons).toHaveLength(2);
    expect(reasons[0].reason).toBe('Location');
    expect(reasons[0].note).toBe('Austin in-office');
    expect(reasons[1].reason).toBe('Compensation');
    expect(reasons[1].note).toBeNull();
  });

  test('inserts termination reasons when role_status is Closed', () => {
    const id = addRole(db, {
      ...baseRole,
      role_status:         'Closed',
      termination_reasons: [{ reason: 'Screened Out', note: null }],
    });

    const reasons = db.prepare('SELECT * FROM termination_reasons WHERE role_id = ?').all(id) as Record<string, unknown>[];

    expect(reasons).toHaveLength(1);
    expect(reasons[0].reason).toBe('Screened Out');
  });

  test('inserts role with Applied status and applied_date', () => {
    const id = addRole(db, {
      ...baseRole,
      role_status:  'Applied',
      applied_date: '2026-04-27',
    });

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;
    expect(role.role_status).toBe('Applied');
    expect(role.applied_date).toBe('2026-04-27');
  });

});

// ─── Required field validation ─────────────────────────────────────────────────

describe('addRole — required field validation', () => {

  const baseRole: RoleInput = {
    company:     'Acme',
    title:       'QA Engineer',
    url:         'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd:          'This is a job description.',
  };

  test('throws when company is missing', () => {
    const role = { ...baseRole, company: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('company is required');
  });

  test('throws when title is missing', () => {
    const role = { ...baseRole, title: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('title is required');
  });

  test('throws when url is missing', () => {
    const role = { ...baseRole, url: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('url is required');
  });

  test('throws when role_status is missing', () => {
    const role = { ...baseRole, role_status: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('role_status is required');
  });

  test('throws when jd is missing', () => {
    const role = { ...baseRole, jd: null } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('jd is required');
  });

  test('throws when required field is empty string', () => {
    const role = { ...baseRole, company: '' } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('company is required');
  });

  test('throws when required field is whitespace only', () => {
    const role = { ...baseRole, title: '   ' } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow('title is required');
  });

  test('throws with all missing fields listed', () => {
    expect(() => addRole(db, {} as unknown as RoleInput)).toThrow('Validation failed');
  });

});

// ─── Contextual validation ─────────────────────────────────────────────────────

describe('addRole — contextual validation', () => {

  const baseRole: RoleInput = {
    company:     'Acme',
    title:       'QA Engineer',
    url:         'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd:          'This is a job description.',
  };

  test('throws when role_status is Applied and applied_date is missing', () => {
    const role = { ...baseRole, role_status: 'Applied' } as RoleInput;
    expect(() => addRole(db, role)).toThrow('applied_date is required when role_status is Applied');
  });

  test('throws when role_status is Skipped and skip_reasons is null', () => {
    const role = { ...baseRole, role_status: 'Skipped', skip_reasons: null } as RoleInput;
    expect(() => addRole(db, role)).toThrow('skip_reasons is required when role_status is Skipped');
  });

  test('throws when role_status is Skipped and skip_reasons is empty array', () => {
    const role = { ...baseRole, role_status: 'Skipped', skip_reasons: [] } as RoleInput;
    expect(() => addRole(db, role)).toThrow('skip_reasons is required when role_status is Skipped');
  });

  test('throws when role_status is Closed and termination_reasons is null', () => {
    const role = { ...baseRole, role_status: 'Closed', termination_reasons: null } as RoleInput;
    expect(() => addRole(db, role)).toThrow('termination_reasons is required when role_status is Closed');
  });

  test('throws when role_status is Closed and termination_reasons is empty array', () => {
    const role = { ...baseRole, role_status: 'Closed', termination_reasons: [] } as RoleInput;
    expect(() => addRole(db, role)).toThrow('termination_reasons is required when role_status is Closed');
  });

});

// ─── SQLite constraint violations ─────────────────────────────────────────────

describe('addRole — SQLite constraint violations', () => {

  const baseRole: RoleInput = {
    company:     'Acme',
    title:       'QA Engineer',
    url:         'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd:          'This is a job description.',
  };

  test('throws on invalid role_status value', () => {
    const role = { ...baseRole, role_status: 'InvalidStatus' } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow();
  });

  test('throws on invalid candidacy value', () => {
    const role = { ...baseRole, candidacy: 'InvalidCandidacy' } as unknown as RoleInput;
    expect(() => addRole(db, role)).toThrow();
  });

  test('throws on invalid skip_reason value', () => {
    const role: RoleInput = {
      ...baseRole,
      role_status:  'Skipped',
      skip_reasons: [{ reason: 'InvalidReason' as never, note: null }],
    };
    expect(() => addRole(db, role)).toThrow();
  });

  test('throws on invalid termination_reason value', () => {
    const role: RoleInput = {
      ...baseRole,
      role_status:         'Closed',
      termination_reasons: [{ reason: 'InvalidReason' as never, note: null }],
    };
    expect(() => addRole(db, role)).toThrow();
  });

});

// ─── Transaction integrity ─────────────────────────────────────────────────────

describe('addRole — transaction integrity', () => {

  test('rolls back role insert if skip_reason insert fails', () => {
    const role: RoleInput = {
      company:     'Acme',
      title:       'QA Engineer',
      url:         'https://example.com/job/1',
      role_status: 'Skipped',
      jd:          'This is a job description.',
      skip_reasons: [{ reason: 'InvalidReason' as never, note: null }],
    };

    expect(() => addRole(db, role)).toThrow();

    const roles = db.prepare('SELECT * FROM roles').all();
    expect(roles).toHaveLength(0);
  });

});
