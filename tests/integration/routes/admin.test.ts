// tests/integration/routes/admin.test.ts

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { createTestDb } from '../../helpers/db';
import { adminRouter } from '../../../server/routes/admin';
import { addRole } from '../../../lib/roles';
import { db } from '../../../lib/db';
import { RoleInput } from '../../../lib/types';
import { TEST_COMPANIES } from '../../../e2e/fixtures/roles';
import { E2E_STUB_URL_PREFIX } from '../../../e2e/fixtures/jobStubs';

let app: FastifyInstance;
let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = createTestDb();

  app = Fastify();
  await app.register(adminRouter, { prefix: '/api/admin', db: sqlite });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  sqlite.close();
});

function makeRole(overrides: Partial<RoleInput> = {}): RoleInput {
  return {
    company: TEST_COMPANIES[0],
    title: 'QA Engineer',
    url: 'https://example.com/job/1',
    role_status: 'Pending Triage',
    jd: 'A job description.',
    ...overrides,
  };
}

describe('POST /api/admin/cleanup', () => {
  test('returns 200 with per-type deleted counts', async () => {
    const matchingRoleId = addRole(sqlite, makeRole());
    const matchingStubId = db.jobStubs.insertStub(sqlite, `${E2E_STUB_URL_PREFIX}chromium/abc`);

    const cleanupResponse = await app.inject({ method: 'POST', url: '/api/admin/cleanup' });

    expect(cleanupResponse.statusCode).toBe(200);
    expect(cleanupResponse.json()).toEqual({
      roles: { deleted: [matchingRoleId], count: 1 },
      stubs: { deleted: [matchingStubId], count: 1 },
    });
  });

  test('deletes only test-marked roles and stubs, leaving real data intact', async () => {
    const matchingRoleId = addRole(sqlite, makeRole());
    const realRoleId = addRole(
      sqlite,
      makeRole({ company: 'Real Company', url: 'https://example.com/job/2' })
    );
    const matchingStubId = db.jobStubs.insertStub(sqlite, `${E2E_STUB_URL_PREFIX}chromium/abc`);
    const realStubId = db.jobStubs.insertStub(sqlite, 'https://example.com/jobs/1');

    await app.inject({ method: 'POST', url: '/api/admin/cleanup' });

    expect(db.roles.getById(sqlite, matchingRoleId)).toBeUndefined();
    expect(db.roles.getById(sqlite, realRoleId)).not.toBeUndefined();
    expect(db.jobStubs.getById(sqlite, matchingStubId)).toBeUndefined();
    expect(db.jobStubs.getById(sqlite, realStubId)).not.toBeUndefined();
  });

  test('returns zero counts when nothing matches', async () => {
    const cleanupResponse = await app.inject({ method: 'POST', url: '/api/admin/cleanup' });

    expect(cleanupResponse.statusCode).toBe(200);
    expect(cleanupResponse.json()).toEqual({
      roles: { deleted: [], count: 0 },
      stubs: { deleted: [], count: 0 },
    });
  });
});
