// tests/unit/deletes.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../helpers/db';
import { addRole } from '../../lib/roles';
import {
  previewRoleDeletion,
  deleteRole,
  previewSkipReasonDeletion,
  deleteSkipReason,
  previewTerminationReasonDeletion,
  deleteTerminationReason,
} from '../../lib/deletes';
import { RoleInput } from '../../lib/types';

let db: Database.Database;

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

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.close();
});

// ─── previewRoleDeletion ──────────────────────────────────────────────────────

describe('previewRoleDeletion', () => {
  test('returns role details', () => {
    const id = addRole(db, baseRole);
    const preview = previewRoleDeletion(db, id);

    expect(preview.role.company).toBe(baseRole.company);
    expect(preview.role.title).toBe(baseRole.title);
  });

  test('returns empty dependent arrays for clean role', () => {
    const id = addRole(db, baseRole);
    const preview = previewRoleDeletion(db, id);

    expect(preview.skip_reasons).toHaveLength(0);
    expect(preview.termination_reasons).toHaveLength(0);
    expect(preview.job_descriptions).toHaveLength(1);
  });

  test('returns skip reasons for skipped role', () => {
    const id = addRole(db, skippedRole);
    const preview = previewRoleDeletion(db, id);

    expect(preview.skip_reasons).toHaveLength(1);
    expect(preview.skip_reasons[0].reason).toBe('Location');
  });

  test('returns termination reasons for closed role', () => {
    const id = addRole(db, closedRole);
    const preview = previewRoleDeletion(db, id);

    expect(preview.termination_reasons).toHaveLength(1);
    expect(preview.termination_reasons[0].reason).toBe('Screened Out');
  });

  test('throws when role not found', () => {
    expect(() => previewRoleDeletion(db, 999)).toThrow('No role found with ID 999');
  });
});

// ─── deleteRole ───────────────────────────────────────────────────────────────

describe('deleteRole', () => {
  test('deletes a role with no dependents', () => {
    const id = addRole(db, baseRole);

    // Delete JD first so role has no dependents
    db.prepare('DELETE FROM job_descriptions WHERE role_id = ?').run(id);
    deleteRole(db, id, false);

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
    expect(role).toBeUndefined();
  });

  test('refuses to delete role with dependents in normal mode', () => {
    const id = addRole(db, skippedRole);
    expect(() => deleteRole(db, id, false)).toThrow('has dependent records');
  });

  test('role remains intact after refused deletion', () => {
    const id = addRole(db, skippedRole);
    expect(() => deleteRole(db, id, false)).toThrow(/has dependent records/);
  });

  test('force deletes role and all dependents', () => {
    const id = addRole(db, skippedRole);
    deleteRole(db, id, true);

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
    const skipReasons = db.prepare('SELECT * FROM skip_reasons WHERE role_id = ?').all(id);
    const jds = db.prepare('SELECT * FROM job_descriptions WHERE role_id = ?').all(id);

    expect(role).toBeUndefined();
    expect(skipReasons).toHaveLength(0);
    expect(jds).toHaveLength(0);
  });

  test('throws when role not found', () => {
    expect(() => deleteRole(db, 999, false)).toThrow('No role found with ID 999');
  });

  test('returns pre-deletion role details', () => {
    const id = addRole(db, baseRole);
    db.prepare('DELETE FROM job_descriptions WHERE role_id = ?').run(id);

    const result = deleteRole(db, id, false);
    expect(result.role.company).toBe(baseRole.company);
  });
});

// ─── previewSkipReasonDeletion ────────────────────────────────────────────────

describe('previewSkipReasonDeletion', () => {
  test('returns skip reason and parent role', () => {
    const roleId = addRole(db, skippedRole);
    const sr = db.prepare('SELECT * FROM skip_reasons WHERE role_id = ?').get(roleId) as {
      id: number;
    };

    const preview = previewSkipReasonDeletion(db, sr.id);

    expect(preview.reason.reason).toBe('Location');
    expect(preview.role.id).toBe(roleId);
    expect(preview.role.company).toBe(baseRole.company);
  });

  test('throws when skip reason not found', () => {
    expect(() => previewSkipReasonDeletion(db, 999)).toThrow('No skip reason found with ID 999');
  });
});

// ─── deleteSkipReason ─────────────────────────────────────────────────────────

describe('deleteSkipReason', () => {
  test('deletes skip reason by id', () => {
    const roleId = addRole(db, skippedRole);
    const sr = db.prepare('SELECT * FROM skip_reasons WHERE role_id = ?').get(roleId) as {
      id: number;
    };

    deleteSkipReason(db, sr.id);

    const result = db.prepare('SELECT * FROM skip_reasons WHERE id = ?').get(sr.id);
    expect(result).toBeUndefined();
  });

  test('returns deleted reason and parent role', () => {
    const roleId = addRole(db, skippedRole);
    const sr = db.prepare('SELECT * FROM skip_reasons WHERE role_id = ?').get(roleId) as {
      id: number;
    };

    const result = deleteSkipReason(db, sr.id);

    expect(result.reason.reason).toBe('Location');
    expect(result.role.company).toBe(baseRole.company);
  });

  test('throws when skip reason not found', () => {
    expect(() => deleteSkipReason(db, 999)).toThrow('No skip reason found with ID 999');
  });
});

// ─── previewTerminationReasonDeletion ─────────────────────────────────────────

describe('previewTerminationReasonDeletion', () => {
  test('returns termination reason and parent role', () => {
    const roleId = addRole(db, closedRole);
    const tr = db.prepare('SELECT * FROM termination_reasons WHERE role_id = ?').get(roleId) as {
      id: number;
    };

    const preview = previewTerminationReasonDeletion(db, tr.id);

    expect(preview.reason.reason).toBe('Screened Out');
    expect(preview.role.id).toBe(roleId);
  });

  test('throws when termination reason not found', () => {
    expect(() => previewTerminationReasonDeletion(db, 999)).toThrow(
      'No termination reason found with ID 999'
    );
  });
});

// ─── deleteTerminationReason ──────────────────────────────────────────────────

describe('deleteTerminationReason', () => {
  test('deletes termination reason by id', () => {
    const roleId = addRole(db, closedRole);
    const tr = db.prepare('SELECT * FROM termination_reasons WHERE role_id = ?').get(roleId) as {
      id: number;
    };

    deleteTerminationReason(db, tr.id);

    const result = db.prepare('SELECT * FROM termination_reasons WHERE id = ?').get(tr.id);
    expect(result).toBeUndefined();
  });

  test('returns deleted reason and parent role', () => {
    const roleId = addRole(db, closedRole);
    const tr = db.prepare('SELECT * FROM termination_reasons WHERE role_id = ?').get(roleId) as {
      id: number;
    };

    const result = deleteTerminationReason(db, tr.id);

    expect(result.reason.reason).toBe('Screened Out');
    expect(result.role.company).toBe(baseRole.company);
  });

  test('throws when termination reason not found', () => {
    expect(() => deleteTerminationReason(db, 999)).toThrow(
      'No termination reason found with ID 999'
    );
  });
});
