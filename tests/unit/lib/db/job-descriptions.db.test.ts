// tests/unit/db/job-descriptions.db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../helpers/db';
import { insertRole } from '../../../../lib/db/roles.db';
import { db } from '../../../../lib/db';

let sqlite: Database.Database;

const baseRole = {
  company: 'Acme Corp',
  title: 'QA Engineer',
  url: 'https://example.com',
  role_status: 'Pending Triage',
};

beforeEach(() => {
  sqlite = createTestDb();
});
afterEach(() => {
  sqlite.close();
});

// ─── insert ─────────────────────────────────────────────────────

describe('insert', () => {
  test('inserts a job description and returns a numeric ID', () => {
    const jobDescriptionContent = 'This is a job description.';
    const roleId = insertRole(sqlite, baseRole);
    const id = db.jobDescriptions.insert(sqlite, roleId, jobDescriptionContent);
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  test('inserted content is retrievable', () => {
    const jobDescriptionContent = 'This is a job description.';
    const roleId = insertRole(sqlite, baseRole);
    db.jobDescriptions.insert(sqlite, roleId, jobDescriptionContent);
    const jd = db.jobDescriptions.getByRoleId(sqlite, roleId);
    expect(jd!.content).toBe(jobDescriptionContent);
  });

  test('stores empty string content', () => {
    const jobDescriptionContent = '';
    const roleId = insertRole(sqlite, baseRole);
    db.jobDescriptions.insert(sqlite, roleId, jobDescriptionContent);
    const jd = db.jobDescriptions.getByRoleId(sqlite, roleId);
    expect(jd!.content).toBe(jobDescriptionContent);
  });

  test('throws on duplicate role_id — UNIQUE constraint', () => {
    const firstJobDescriptionContent = 'First JD';
    const secondJobDescriptionContent = 'Second JD';
    const roleId = insertRole(sqlite, baseRole);
    db.jobDescriptions.insert(sqlite, roleId, firstJobDescriptionContent);
    expect(() => db.jobDescriptions.insert(sqlite, roleId, secondJobDescriptionContent)).toThrow();
  });

  test('throws on non-existent role_id — FK constraint', () => {
    const jobDescriptionContent = 'This is a job description.';
    expect(() => db.jobDescriptions.insert(sqlite, 999, jobDescriptionContent)).toThrow();
  });

  test('allows job descriptions for different roles', () => {
    const firstJobDescriptionContent = 'First JD';
    const secondJobDescriptionContent = 'Second JD';
    const roleId1 = insertRole(sqlite, baseRole);
    const roleId2 = insertRole(sqlite, baseRole);
    expect(() =>
      db.jobDescriptions.insert(sqlite, roleId1, firstJobDescriptionContent)
    ).not.toThrow();
    expect(() =>
      db.jobDescriptions.insert(sqlite, roleId2, secondJobDescriptionContent)
    ).not.toThrow();
  });
});

// ─── getByRoleId ────────────────────────────────────────────────

describe('getByRoleId', () => {
  test('returns job description when found', () => {
    const jobDescriptionContent = 'This is a job description.';
    const roleId = insertRole(sqlite, baseRole);
    db.jobDescriptions.insert(sqlite, roleId, jobDescriptionContent);
    const jd = db.jobDescriptions.getByRoleId(sqlite, roleId);
    expect(jd).toBeDefined();
    expect(jd!.role_id).toBe(roleId);
    expect(jd!.content).toBe(jobDescriptionContent);
  });

  test('returns undefined when not found', () => {
    const roleId = insertRole(sqlite, baseRole);
    const jd = db.jobDescriptions.getByRoleId(sqlite, roleId);
    expect(jd).toBeUndefined();
  });
});

// ─── deleteByRoleId ─────────────────────────────────────────────

describe('deleteByRoleId', () => {
  test('deletes the job description', () => {
    const jobDescriptionContent = 'This is a job description.';
    const roleId = insertRole(sqlite, baseRole);
    db.jobDescriptions.insert(sqlite, roleId, jobDescriptionContent);
    db.jobDescriptions.deleteByRoleId(sqlite, roleId);
    expect(db.jobDescriptions.getByRoleId(sqlite, roleId)).toBeUndefined();
  });

  test('does not affect job descriptions for other roles', () => {
    const jobDescriptionContent = 'This is a job description.';
    const roleId1 = insertRole(sqlite, baseRole);
    const roleId2 = insertRole(sqlite, baseRole);
    db.jobDescriptions.insert(sqlite, roleId1, jobDescriptionContent);
    db.jobDescriptions.insert(sqlite, roleId2, jobDescriptionContent);
    db.jobDescriptions.deleteByRoleId(sqlite, roleId1);
    expect(db.jobDescriptions.getByRoleId(sqlite, roleId1)).toBeUndefined();
    expect(db.jobDescriptions.getByRoleId(sqlite, roleId2)).toBeDefined();
  });

  test('safely makes no change when target job description does not exist', () => {
    const roleId = insertRole(sqlite, baseRole);
    const result = db.jobDescriptions.deleteByRoleId(sqlite, roleId);
    expect(result.changes).toBe(0);
  });
});
