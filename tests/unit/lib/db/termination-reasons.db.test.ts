// tests/unit/lib/db/termination-reasons.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb }  from '../../../helpers/db';
import { insertRole }    from '../../../../lib/db/roles.db';
import {
    insertTerminationReason,
    getTerminationReasonsByRoleId,
    getTerminationReasonById,
    deleteTerminationReasonById,
    deleteTerminationReasonsByRoleId,
} from '../../../../lib/db/termination-reasons.db';

let db: Database.Database;

const baseRole = {
    company:     'Acme Corp',
    title:       'QA Engineer',
    url:         'https://example.com',
    role_status: 'Closed',
};

beforeEach(() => { db = createTestDb(); });
afterEach(()  => { db.close(); });

// ─── insertTerminationReason ──────────────────────────────────────────────────

describe('insertTerminationReason', () => {

    test('inserts a termination reason and returns a numeric ID', () => {
        const roleId = insertRole(db, baseRole);
        const id     = insertTerminationReason(db, roleId, 'Screened Out', null);
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
    });

    test('inserts with note when provided', () => {
        const note   = 'Failed technical screen';
        const roleId = insertRole(db, baseRole);
        const id     = insertTerminationReason(db, roleId, 'Screened Out', note);
        const reason = db.prepare('SELECT * FROM termination_reasons WHERE id = ?').get(id) as Record<string, unknown>;
        expect(reason.note).toBe(note);
    });

    test('inserts with null note when not provided', () => {
        const roleId = insertRole(db, baseRole);
        const id     = insertTerminationReason(db, roleId, 'Screened Out', null);
        const reason = db.prepare('SELECT * FROM termination_reasons WHERE id = ?').get(id) as Record<string, unknown>;
        expect(reason.note).toBeNull();
    });

    test('throws on invalid reason — CHECK constraint', () => {
        const roleId = insertRole(db, baseRole);
        expect(() => insertTerminationReason(db, roleId, 'InvalidReason', null)).toThrow();
    });

    test('throws on non-existent role_id — FK constraint', () => {
        expect(() => insertTerminationReason(db, 999, 'Screened Out', null)).toThrow();
    });

    test('allows multiple termination reasons for the same role', () => {
        const roleId = insertRole(db, baseRole);
        insertTerminationReason(db, roleId, 'Screened Out', null);
        insertTerminationReason(db, roleId, 'Filled', null);
        const reasons = getTerminationReasonsByRoleId(db, roleId);
        expect(reasons).toHaveLength(2);
    });

});

// ─── getTerminationReasonsByRoleId ────────────────────────────────────────────

describe('getTerminationReasonsByRoleId', () => {

    test('returns all termination reasons for a role ordered by id ASC', () => {
        const roleId = insertRole(db, baseRole);
        insertTerminationReason(db, roleId, 'Screened Out', null);
        insertTerminationReason(db, roleId, 'Filled', null);
        insertTerminationReason(db, roleId, 'Cancelled', null);
        const reasons = getTerminationReasonsByRoleId(db, roleId);
        expect(reasons).toHaveLength(3);
        expect(reasons[0].reason).toBe('Screened Out');
        expect(reasons[1].reason).toBe('Filled');
        expect(reasons[2].reason).toBe('Cancelled');
    });

    test('returns empty array when no reasons exist', () => {
        const roleId  = insertRole(db, baseRole);
        const reasons = getTerminationReasonsByRoleId(db, roleId);
        expect(reasons).toHaveLength(0);
    });

    test('does not return reasons for other roles', () => {
        const roleId1 = insertRole(db, baseRole);
        const roleId2 = insertRole(db, baseRole);
        insertTerminationReason(db, roleId1, 'Screened Out', null);
        const reasons = getTerminationReasonsByRoleId(db, roleId2);
        expect(reasons).toHaveLength(0);
    });

});

// ─── getTerminationReasonById ─────────────────────────────────────────────────

describe('getTerminationReasonById', () => {

    test('returns termination reason when found', () => {
        const note   = 'Failed technical screen';
        const roleId = insertRole(db, baseRole);
        const id     = insertTerminationReason(db, roleId, 'Screened Out', note);
        const reason = getTerminationReasonById(db, id);
        expect(reason).toBeDefined();
        expect(reason!.reason).toBe('Screened Out');
        expect(reason!.note).toBe(note);
        expect(reason!.role_id).toBe(roleId);
    });

    test('returns undefined when not found', () => {
        const reason = getTerminationReasonById(db, 999);
        expect(reason).toBeUndefined();
    });

});

// ─── deleteTerminationReasonById ──────────────────────────────────────────────

describe('deleteTerminationReasonById', () => {

    test('deletes the termination reason and returns one change', () => {
        const roleId = insertRole(db, baseRole);
        const id     = insertTerminationReason(db, roleId, 'Screened Out', null);
        const result = deleteTerminationReasonById(db, id);
        expect(getTerminationReasonById(db, id)).toBeUndefined();
        expect(result.changes).toBe(1);
    });

    test('does not affect other termination reasons for the same role', () => {
        const roleId = insertRole(db, baseRole);
        const id1    = insertTerminationReason(db, roleId, 'Screened Out', null);
        const id2    = insertTerminationReason(db, roleId, 'Filled', null);
        deleteTerminationReasonById(db, id1);
        expect(getTerminationReasonById(db, id2)).toBeDefined();
    });

    test('safely makes no change when termination reason does not exist', () => {
        const result = deleteTerminationReasonById(db, 999);
        expect(result.changes).toBe(0);
    });

});

// ─── deleteTerminationReasonsByRoleId ─────────────────────────────────────────

describe('deleteTerminationReasonsByRoleId', () => {

    test('deletes all termination reasons for a role and returns correct change count', () => {
        const roleId = insertRole(db, baseRole);
        insertTerminationReason(db, roleId, 'Screened Out', null);
        insertTerminationReason(db, roleId, 'Filled', null);
        const result = deleteTerminationReasonsByRoleId(db, roleId);
        expect(getTerminationReasonsByRoleId(db, roleId)).toHaveLength(0);
        expect(result.changes).toBe(2);
    });

    test('does not affect termination reasons for other roles', () => {
        const roleId1 = insertRole(db, baseRole);
        const roleId2 = insertRole(db, baseRole);
        insertTerminationReason(db, roleId1, 'Screened Out', null);
        insertTerminationReason(db, roleId2, 'Filled', null);
        deleteTerminationReasonsByRoleId(db, roleId1);
        expect(getTerminationReasonsByRoleId(db, roleId2)).toHaveLength(1);
    });

    test('safely makes no change when no termination reasons exist for role', () => {
        const roleId = insertRole(db, baseRole);
        const result = deleteTerminationReasonsByRoleId(db, roleId);
        expect(result.changes).toBe(0);
    });

});