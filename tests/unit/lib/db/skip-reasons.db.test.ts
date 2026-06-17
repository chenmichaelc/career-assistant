// tests/unit/lib/db/skip-reasons.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb }  from '../../../helpers/db';
import { insertRole }    from '../../../../lib/db/roles.db';
import {
    insertSkipReason,
    getSkipReasonsByRoleId,
    getSkipReasonById,
    deleteSkipReasonById,
    deleteSkipReasonsByRoleId,
} from '../../../../lib/db/skip-reasons.db';

let db: Database.Database;

const baseRole = {
    company:     'Acme Corp',
    title:       'QA Engineer',
    url:         'https://example.com',
    role_status: 'Skipped',
};

beforeEach(() => {
 db = createTestDb(); 
});
afterEach(()  => {
 db.close(); 
});

// ─── insertSkipReason ─────────────────────────────────────────────────────────

describe('insertSkipReason', () => {

    test('inserts a skip reason and returns a numeric ID', () => {
        const roleId = insertRole(db, baseRole);
        const id     = insertSkipReason(db, roleId, 'Location', null);
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
    });

    test('inserts with note when provided', () => {
        const note   = 'Austin in-office';
        const roleId = insertRole(db, baseRole);
        const id     = insertSkipReason(db, roleId, 'Location', note);
        const reason = db.prepare('SELECT * FROM skip_reasons WHERE id = ?').get(id) as Record<string, unknown>;
        expect(reason.note).toBe(note);
    });

    test('inserts with null note when not provided', () => {
        const roleId = insertRole(db, baseRole);
        const id     = insertSkipReason(db, roleId, 'Location', null);
        const reason = db.prepare('SELECT * FROM skip_reasons WHERE id = ?').get(id) as Record<string, unknown>;
        expect(reason.note).toBeNull();
    });

    test('throws on invalid reason — CHECK constraint', () => {
        const roleId = insertRole(db, baseRole);
        expect(() => insertSkipReason(db, roleId, 'InvalidReason', null)).toThrow();
    });

    test('throws on non-existent role_id — FK constraint', () => {
        expect(() => insertSkipReason(db, 999, 'Location', null)).toThrow();
    });

    test('allows multiple skip reasons for the same role', () => {
        const roleId = insertRole(db, baseRole);
        insertSkipReason(db, roleId, 'Location', null);
        insertSkipReason(db, roleId, 'Compensation', null);
        const reasons = getSkipReasonsByRoleId(db, roleId);
        expect(reasons).toHaveLength(2);
    });

});

// ─── getSkipReasonsByRoleId ───────────────────────────────────────────────────

describe('getSkipReasonsByRoleId', () => {

    test('returns all skip reasons for a role ordered by id ASC', () => {
        const roleId = insertRole(db, baseRole);
        insertSkipReason(db, roleId, 'Location', null);
        insertSkipReason(db, roleId, 'Compensation', null);
        insertSkipReason(db, roleId, 'Culture', null);
        const reasons = getSkipReasonsByRoleId(db, roleId);
        expect(reasons).toHaveLength(3);
        expect(reasons[0].reason).toBe('Location');
        expect(reasons[1].reason).toBe('Compensation');
        expect(reasons[2].reason).toBe('Culture');
    });

    test('returns empty array when no reasons exist', () => {
        const roleId  = insertRole(db, baseRole);
        const reasons = getSkipReasonsByRoleId(db, roleId);
        expect(reasons).toHaveLength(0);
    });

    test('does not return reasons for other roles', () => {
        const roleId1 = insertRole(db, baseRole);
        const roleId2 = insertRole(db, baseRole);
        insertSkipReason(db, roleId1, 'Location', null);
        const reasons = getSkipReasonsByRoleId(db, roleId2);
        expect(reasons).toHaveLength(0);
    });

});

// ─── getSkipReasonById ────────────────────────────────────────────────────────

describe('getSkipReasonById', () => {

    test('returns skip reason when found', () => {
        const note   = 'Austin in-office';
        const roleId = insertRole(db, baseRole);
        const id     = insertSkipReason(db, roleId, 'Location', note);
        const reason = getSkipReasonById(db, id);
        expect(reason).toBeDefined();
        expect(reason!.reason).toBe('Location');
        expect(reason!.note).toBe(note);
        expect(reason!.role_id).toBe(roleId);
    });

    test('returns undefined when not found', () => {
        const reason = getSkipReasonById(db, 999);
        expect(reason).toBeUndefined();
    });

});

// ─── deleteSkipReasonById ─────────────────────────────────────────────────────

describe('deleteSkipReasonById', () => {

    test('deletes the skip reason and returns one change', () => {
        const roleId = insertRole(db, baseRole);
        const id     = insertSkipReason(db, roleId, 'Location', null);
        const result = deleteSkipReasonById(db, id);
        expect(getSkipReasonById(db, id)).toBeUndefined();
        expect(result.changes).toBe(1);
    });

    test('does not affect other skip reasons for the same role', () => {
        const roleId = insertRole(db, baseRole);
        const id1    = insertSkipReason(db, roleId, 'Location', null);
        const id2    = insertSkipReason(db, roleId, 'Compensation', null);
        deleteSkipReasonById(db, id1);
        expect(getSkipReasonById(db, id2)).toBeDefined();
    });

    test('safely makes no change when skip reason does not exist', () => {
        const result = deleteSkipReasonById(db, 999);
        expect(result.changes).toBe(0);
    });

});

// ─── deleteSkipReasonsByRoleId ────────────────────────────────────────────────

describe('deleteSkipReasonsByRoleId', () => {

    test('deletes all skip reasons for a role and returns correct change count', () => {
        const roleId = insertRole(db, baseRole);
        insertSkipReason(db, roleId, 'Location', null);
        insertSkipReason(db, roleId, 'Compensation', null);
        const result = deleteSkipReasonsByRoleId(db, roleId);
        expect(getSkipReasonsByRoleId(db, roleId)).toHaveLength(0);
        expect(result.changes).toBe(2);
    });

    test('does not affect skip reasons for other roles', () => {
        const roleId1 = insertRole(db, baseRole);
        const roleId2 = insertRole(db, baseRole);
        insertSkipReason(db, roleId1, 'Location', null);
        insertSkipReason(db, roleId2, 'Compensation', null);
        deleteSkipReasonsByRoleId(db, roleId1);
        expect(getSkipReasonsByRoleId(db, roleId2)).toHaveLength(1);
    });

    test('safely makes no change when no skip reasons exist for role', () => {
        const roleId = insertRole(db, baseRole);
        const result = deleteSkipReasonsByRoleId(db, roleId);
        expect(result.changes).toBe(0);
    });

});