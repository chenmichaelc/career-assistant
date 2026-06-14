// tests/unit/lib/db/roles.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb }  from '../../../helpers/db';
import {
    insertRole,
    getRoleById,
    updateRoleStatus,
    deleteRoleById,
    RoleInsertData,
} from '../../../../lib/db/roles.db';

let db: Database.Database;

const baseRole: RoleInsertData = {
    company:     'Acme Corp',
    title:       'QA Engineer',
    url:         'https://example.com/job/1',
    role_status: 'Pending Triage',
};

beforeEach(() => { db = createTestDb(); });
afterEach(()  => { db.close(); });

// ─── insertRole ───────────────────────────────────────────────────────────────

describe('insertRole', () => {

    test('inserts a role and returns a numeric ID', () => {
        const id = insertRole(db, baseRole);
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
    });

    test('inserted role is retrievable with correct values', () => {
        const id   = insertRole(db, baseRole);
        const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;
        expect(role.company).toBe('Acme Corp');
        expect(role.title).toBe('QA Engineer');
        expect(role.role_status).toBe('Pending Triage');
    });

    test('nulls optional fields when not provided', () => {
        const id   = insertRole(db, baseRole);
        const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;
        expect(role.candidacy).toBeNull();
        expect(role.applied_date).toBeNull();
        expect(role.salary_min).toBeNull();
        expect(role.salary_max).toBeNull();
        expect(role.notes).toBeNull();
    });

    test('stores optional fields when provided', () => {
        const id = insertRole(db, {
            ...baseRole,
            candidacy:    'Competitive',
            applied_date: '2024-01-15',
            salary_min:   100000,
            salary_max:   130000,
            notes:        'Good match',
        });
        const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Record<string, unknown>;
        expect(role.candidacy).toBe('Competitive');
        expect(role.applied_date).toBe('2024-01-15');
        expect(role.salary_min).toBe(100000);
        expect(role.salary_max).toBe(130000);
        expect(role.notes).toBe('Good match');
    });

    test('throws on invalid role_status — CHECK constraint', () => {
        expect(() => insertRole(db, { ...baseRole, role_status: 'InvalidStatus' })).toThrow();
    });

    test('throws on invalid candidacy — CHECK constraint', () => {
        expect(() => insertRole(db, { ...baseRole, candidacy: 'InvalidCandidacy' })).toThrow();
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
        const id   = insertRole(db, baseRole);
        const role = getRoleById(db, id);
        expect(role).toBeDefined();
        expect(role!.id).toBe(id);
        expect(role!.company).toBe('Acme Corp');
    });

    test('returns undefined when not found', () => {
        const role = getRoleById(db, 999);
        expect(role).toBeUndefined();
    });

});

// ─── updateRoleStatus ─────────────────────────────────────────────────────────

describe('updateRoleStatus', () => {

    test('updates role_status correctly and returns one change', () => {
        const id     = insertRole(db, baseRole);
        const result = updateRoleStatus(db, id, 'Applied');
        const role   = db.prepare('SELECT role_status FROM roles WHERE id = ?').get(id) as Record<string, unknown>;
        expect(role.role_status).toBe('Applied');
        expect(result.changes).toBe(1);
    });

    test('sets applied_date when transitioning to Applied and no date exists', () => {
        const id = insertRole(db, baseRole);
        updateRoleStatus(db, id, 'Applied');
        const role = db.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<string, unknown>;
        expect(role.applied_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('preserves existing applied_date when transitioning to Applied', () => {
        const existingDate = '2024-01-15';
        const id           = insertRole(db, { ...baseRole, applied_date: existingDate });
        updateRoleStatus(db, id, 'Applied');
        const role = db.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<string, unknown>;
        expect(role.applied_date).toBe(existingDate);
    });

    test('does not set applied_date when transitioning to non-Applied status', () => {
        const id = insertRole(db, baseRole);
        updateRoleStatus(db, id, 'On Hold');
        const role = db.prepare('SELECT applied_date FROM roles WHERE id = ?').get(id) as Record<string, unknown>;
        expect(role.applied_date).toBeNull();
    });

    test('throws on invalid status — CHECK constraint', () => {
        const id = insertRole(db, baseRole);
        expect(() => updateRoleStatus(db, id, 'InvalidStatus')).toThrow();
    });

    test('accepts string or number id', () => {
        const id = insertRole(db, baseRole);
        expect(() => updateRoleStatus(db, String(id), 'On Hold')).not.toThrow();
        expect(() => updateRoleStatus(db, id, 'Callback')).not.toThrow();
    });

    test('safely makes no change when role does not exist', () => {
        const result = updateRoleStatus(db, 999, 'Applied');
        expect(result.changes).toBe(0);
    });

});

// ─── deleteRoleById ───────────────────────────────────────────────────────────

describe('deleteRoleById', () => {

    test('deletes the role and returns one change', () => {
        const id     = insertRole(db, baseRole);
        const result = deleteRoleById(db, id);
        expect(getRoleById(db, id)).toBeUndefined();
        expect(result.changes).toBe(1);
    });

    test('throws on FK violation when job description exists', () => {
        const jobDescriptionContent = 'JD content';
        const id = insertRole(db, baseRole);
        db.prepare('INSERT INTO job_descriptions (role_id, content) VALUES (?, ?)').run(id, jobDescriptionContent);
        expect(() => deleteRoleById(db, id)).toThrow();
    });

    test('throws on FK violation when skip reasons exist', () => {
        const id = insertRole(db, baseRole);
        db.prepare("INSERT INTO skip_reasons (role_id, reason) VALUES (?, 'Location')").run(id);
        expect(() => deleteRoleById(db, id)).toThrow();
    });

    test('safely makes no change when role does not exist', () => {
        const result = deleteRoleById(db, 999);
        expect(result.changes).toBe(0);
    });

});