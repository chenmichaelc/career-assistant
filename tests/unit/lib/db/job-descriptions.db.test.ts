// tests/unit/db/job-descriptions.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb }  from '../../../helpers/db';
import { insertRole }    from '../../../../lib/db/roles.db';
import {
    insertJobDescription,
    getJobDescriptionByRoleId,
    deleteJobDescriptionByRoleId,
} from '../../../../lib/db/job-descriptions.db';

let db: Database.Database;

const baseRole = {
    company:     'Acme Corp',
    title:       'QA Engineer',
    url:         'https://example.com',
    role_status: 'Pending Triage',
};

beforeEach(() => { db = createTestDb(); });
afterEach(()  => { db.close(); });

// ─── insertJobDescription ─────────────────────────────────────────────────────

describe('insertJobDescription', () => {

    test('inserts a job description and returns a numeric ID', () => {
        const jobDescriptionContent = 'This is a job description.'
        const roleId        = insertRole(db, baseRole);
        const id            = insertJobDescription(db, roleId, jobDescriptionContent);
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
    });

    test('inserted content is retrievable', () => {
        const jobDescriptionContent         = 'This is a job description.'
        const roleId                = insertRole(db, baseRole);
        insertJobDescription(db, roleId, jobDescriptionContent);
        const jd   = getJobDescriptionByRoleId(db, roleId);
        expect(jd!.content).toBe(jobDescriptionContent);
    });

    test('stores empty string content', () => {
        const jobDescriptionContent         = ''
        const roleId                = insertRole(db, baseRole);
        insertJobDescription(db, roleId, jobDescriptionContent);
        const jd    = getJobDescriptionByRoleId(db, roleId);
        expect(jd!.content).toBe(jobDescriptionContent);
    });

    test('throws on duplicate role_id — UNIQUE constraint', () => {
        const firstJobDescriptionContent    = 'First JD'
        const secondJobDescriptionContent   = 'Second JD'
        const roleId = insertRole(db, baseRole);
        insertJobDescription(db, roleId, firstJobDescriptionContent);
        expect(() => insertJobDescription(db, roleId, secondJobDescriptionContent)).toThrow();
    });

    test('throws on non-existent role_id — FK constraint', () => {
        const jobDescriptionContent         = 'This is a job description.'
        expect(() => insertJobDescription(db, 999, jobDescriptionContent)).toThrow();
    });

    test('allows job descriptions for different roles', () => {
        const firstJobDescriptionContent    = 'First JD'
        const secondJobDescriptionContent   = 'Second JD'
        const roleId1 = insertRole(db, baseRole);
        const roleId2 = insertRole(db, baseRole);
        expect(() => insertJobDescription(db, roleId1, firstJobDescriptionContent)).not.toThrow();
        expect(() => insertJobDescription(db, roleId2, secondJobDescriptionContent)).not.toThrow();
    });

});

// ─── getJobDescriptionByRoleId ────────────────────────────────────────────────

describe('getJobDescriptionByRoleId', () => {

    test('returns job description when found', () => {
        const jobDescriptionContent = 'This is a job description.'
        const roleId = insertRole(db, baseRole);
        insertJobDescription(db, roleId, jobDescriptionContent);
        const jd = getJobDescriptionByRoleId(db, roleId);
        expect(jd).toBeDefined();
        expect(jd!.role_id).toBe(roleId);
        expect(jd!.content).toBe(jobDescriptionContent);
    });

    test('returns undefined when not found', () => {
        const roleId = insertRole(db, baseRole);
        const jd     = getJobDescriptionByRoleId(db, roleId);
        expect(jd).toBeUndefined();
    });

});

// ─── deleteJobDescriptionByRoleId ─────────────────────────────────────────────

describe('deleteJobDescriptionByRoleId', () => {

    test('deletes the job description', () => {
        const jobDescriptionContent = 'This is a job description.'
        const roleId = insertRole(db, baseRole);
        insertJobDescription(db, roleId, jobDescriptionContent);
        deleteJobDescriptionByRoleId(db, roleId);
        expect(getJobDescriptionByRoleId(db, roleId)).toBeUndefined();
    });

    test('does not affect job descriptions for other roles', () => {
        const jobDescriptionContent = 'This is a job description.'
        const roleId1 = insertRole(db, baseRole);
        const roleId2 = insertRole(db, baseRole);
        insertJobDescription(db, roleId1, jobDescriptionContent);
        insertJobDescription(db, roleId2, jobDescriptionContent);
        deleteJobDescriptionByRoleId(db, roleId1);
        expect(getJobDescriptionByRoleId(db, roleId1)).toBeUndefined();
        expect(getJobDescriptionByRoleId(db, roleId2)).toBeDefined();
    });

    test('safely makes no change when target job description does not exist', () => {
        const roleId = insertRole(db, baseRole);
        const result = deleteJobDescriptionByRoleId(db, roleId);
        expect(result.changes).toBe(0);
    });

});