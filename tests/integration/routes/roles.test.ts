// tests/integration/routes/roles.test.ts
// Career Assistant — HTTP route integration tests

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { createTestDb } from '../../helpers/db';
import { rolesRouter } from '../../../server/routes/roles';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseRole = {
  company: 'Acme Corp',
  title: 'Software Engineer',
  url: 'https://example.com/job/1',
  role_status: 'Pending Triage',
  jd: 'A great job.',
};

const skippedRole = {
  ...baseRole,
  role_status: 'Skipped',
  skip_reasons: [{ reason: 'Compensation', note: null }],
};

const closedRole = {
  ...baseRole,
  role_status: 'Closed',
  termination_reasons: [{ reason: 'Filled', note: null }],
};

const appliedRole = {
  ...baseRole,
  role_status: 'Applied',
  applied_date: '2026-01-01',
};

// ─── Setup ───────────────────────────────────────────────────────────────────

let app: FastifyInstance;
let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = createTestDb();
  app = Fastify();
  await app.register(rolesRouter, { prefix: '/api/roles', db: sqlite });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  sqlite.close();
});

// ─── POST /api/roles ─────────────────────────────────────────────────────────

describe('POST /api/roles', () => {
  test('creates a role and returns a numeric ID', async () => {
    const validRoleResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    expect(validRoleResponse.statusCode).toBe(201);
    expect(typeof validRoleResponse.json().id).toBe('number');
    expect(validRoleResponse.json().id).toBeGreaterThan(0);
  });

  test('returns 400 when required fields are missing', async () => {
    const invalidRoleResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { company: 'Acme Corp' },
    });
    expect(invalidRoleResponse.statusCode).toBe(400);
    expect(invalidRoleResponse.json().error).toBeDefined();
  });

  test('returns 400 when role_status is Skipped with no skip_reasons', async () => {
    const invalidRoleResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, role_status: 'Skipped' },
    });
    expect(invalidRoleResponse.statusCode).toBe(400);
  });

  test('returns 400 when role_status is Closed with no termination_reasons', async () => {
    const rejected = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, role_status: 'Closed' },
    });
    expect(rejected.statusCode).toBe(400);
  });

  test('returns 400 when role_status is Applied with no applied_date', async () => {
    const invalidRoleResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, role_status: 'Applied' },
    });
    expect(invalidRoleResponse.statusCode).toBe(400);
  });

  test('creates a skipped role with skip reasons', async () => {
    const validRoleResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: skippedRole,
    });
    expect(validRoleResponse.statusCode).toBe(201);
  });

  test('creates a closed role with termination reasons', async () => {
    const validRoleResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: closedRole,
    });
    expect(validRoleResponse.statusCode).toBe(201);
  });

  test('creates a role with multiple skip reasons', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: {
        ...skippedRole,
        skip_reasons: [
          { reason: 'Compensation', note: null },
          { reason: 'Location', note: null },
        ],
      },
    });
    expect(roleCreationResponse.statusCode).toBe(201);
    const { id } = roleCreationResponse.json();

    const fetchedRole = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(fetchedRole.json().skip_reasons).toHaveLength(2);
    expect(
      fetchedRole.json().skip_reasons.map((role: { reason: string }) => role.reason)
    ).toContain('Compensation');
    expect(
      fetchedRole.json().skip_reasons.map((role: { reason: string }) => role.reason)
    ).toContain('Location');
  });

  test('creates a role with multiple termination reasons', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: {
        ...closedRole,
        termination_reasons: [
          { reason: 'Filled', note: null },
          { reason: 'Cancelled', note: null },
        ],
      },
    });
    expect(roleCreationResponse.statusCode).toBe(201);
    const { id } = roleCreationResponse.json();

    const fetchedRole = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(fetchedRole.json().termination_reasons).toHaveLength(2);
    expect(
      fetchedRole.json().termination_reasons.map((role: { reason: string }) => role.reason)
    ).toContain('Filled');
    expect(
      fetchedRole.json().termination_reasons.map((role: { reason: string }) => role.reason)
    ).toContain('Cancelled');
  });
});

// ─── GET /api/roles ───────────────────────────────────────────────────────────

describe('GET /api/roles', () => {
  test('returns empty array when no roles exist', async () => {
    const roleList = await app.inject({ method: 'GET', url: '/api/roles' });
    expect(roleList.statusCode).toBe(200);
    expect(roleList.json()).toEqual([]);
  });

  test('returns roles list with reason arrays present on all roles', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: closedRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: skippedRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: appliedRole });
    const roleList = await app.inject({ method: 'GET', url: '/api/roles' });
    expect(roleList.statusCode).toBe(200);
    const roles = roleList.json();
    expect(roles).toHaveLength(4);
    expect(Array.isArray(roles[0].skip_reasons)).toBe(true);
    expect(Array.isArray(roles[0].termination_reasons)).toBe(true);
    expect(Array.isArray(roles[1].skip_reasons)).toBe(true);
    expect(Array.isArray(roles[1].termination_reasons)).toBe(true);
    expect(Array.isArray(roles[2].skip_reasons)).toBe(true);
    expect(Array.isArray(roles[2].termination_reasons)).toBe(true);
    expect(Array.isArray(roles[3].skip_reasons)).toBe(true);
    expect(Array.isArray(roles[3].termination_reasons)).toBe(true);
  });

  test('returns skip reasons attached to the correct role', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: skippedRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    const roleList = await app.inject({ method: 'GET', url: '/api/roles' });
    const roles = roleList.json();
    const skipped = roles.find((role: { role_status: string }) => role.role_status === 'Skipped');
    const pending = roles.find(
      (role: { role_status: string }) => role.role_status === 'Pending Triage'
    );
    expect(skipped.skip_reasons).toHaveLength(1);
    expect(pending.skip_reasons).toHaveLength(0);
  });

  test('filters by status', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: appliedRole });
    const roleList = await app.inject({
      method: 'GET',
      url: '/api/roles?status[]=Applied',
    });
    const roles = roleList.json();
    expect(roles).toHaveLength(1);
    expect(roles[0].role_status).toBe('Applied');
  });

  test('returns role when filtered by correct company', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, company: 'Other Co' },
    });
    const roleList = await app.inject({
      method: 'GET',
      url: '/api/roles?company=Acme',
    });
    const roles = roleList.json();
    expect(roles).toHaveLength(1);
    expect(roles[0].company).toBe('Acme Corp');
  });

  test('does not return role when filtered by incorrect company', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, company: 'Other Co' },
    });
    const roleList = await app.inject({
      method: 'GET',
      url: '/api/roles?company=Zebra',
    });
    const roles = roleList.json();
    expect(roles).toHaveLength(0);
  });

  test('sorts by company ascending', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, company: 'Zebra' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, company: 'Alpha' },
    });
    const roleList = await app.inject({
      method: 'GET',
      url: '/api/roles?sort=company&order=ASC',
    });
    const roles = roleList.json();
    expect(roles[0].company).toBe('Alpha');
    expect(roles[1].company).toBe('Zebra');
  });

  test('sorts by company descending', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, company: 'Zebra' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, company: 'Alpha' },
    });
    const roleList = await app.inject({
      method: 'GET',
      url: '/api/roles?sort=company&order=DESC',
    });
    const roles = roleList.json();
    expect(roles[0].company).toBe('Zebra');
    expect(roles[1].company).toBe('Alpha');
  });

  test('ignores invalid sort keys and falls back to id descending', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: skippedRole });
    const roleList = await app.inject({
      method: 'GET',
      url: '/api/roles?sort=malicious_column',
    });
    expect(roleList.statusCode).toBe(200);
    const roles = roleList.json();
    expect(roles[0].id).toBe(2);
    expect(roles[1].id).toBe(1);
  });

  test('filters by multiple statuses simultaneously', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: appliedRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: skippedRole });

    const roleList = await app.inject({
      method: 'GET',
      url: '/api/roles?status[]=Applied&status[]=Skipped',
    });
    const roles = roleList.json();
    expect(roles).toHaveLength(2);
    expect(roles.map((r: { role_status: string }) => r.role_status)).toContain('Applied');
    expect(roles.map((r: { role_status: string }) => r.role_status)).toContain('Skipped');
    expect(roles.map((r: { role_status: string }) => r.role_status)).not.toContain(
      'Pending Triage'
    );
  });
});

// ─── GET /api/roles/:id ───────────────────────────────────────────────────────

describe('GET /api/roles/:id', () => {
  test('returns role with jd and skip_reasons', async () => {
    const roleWithJdAndSkipReasonsResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: skippedRole,
    });
    const { id } = roleWithJdAndSkipReasonsResponse.json();

    const fetched = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(fetched.statusCode).toBe(200);
    const role = fetched.json();
    expect(role.id).toBe(id);
    expect(role.jd).toBe(skippedRole.jd);
    expect(Array.isArray(role.skip_reasons)).toBe(true);
    expect(role.skip_reasons).toHaveLength(1);
    expect(Array.isArray(role.termination_reasons)).toBe(true);
    expect(role.skip_reasons[0].reason).toEqual(skippedRole.skip_reasons[0].reason);
  });

  test('returns role with termination_reasons', async () => {
    const roleWithTerminationReasonsResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: closedRole,
    });
    const { id } = roleWithTerminationReasonsResponse.json();

    const fetched = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(fetched.statusCode).toBe(200);
    const role = fetched.json();
    expect(role.id).toBe(id);
    expect(role.termination_reasons).toHaveLength(1);
    expect(Array.isArray(role.termination_reasons)).toBe(true);
    expect(role.termination_reasons[0].reason).toEqual(closedRole.termination_reasons[0].reason);
  });

  test('returns 404 for unknown ID', async () => {
    const invalidRole = await app.inject({ method: 'GET', url: '/api/roles/99999' });
    expect(invalidRole.statusCode).toBe(404);
  });
});

// ─── PATCH /api/roles/:id/status ─────────────────────────────────────────────

describe('PATCH /api/roles/:id/status', () => {
  test('updates role status', async () => {
    const validRoleResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = validRoleResponse.json();

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/roles/${id}/status`,
      payload: { status: 'Resume Ready', reasons: [], termination: [] },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().role.role_status).toBe('Resume Ready');
  });

  test('returns 400 on invalid status', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const invalidRoleUpdateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/roles/${id}/status`,
      payload: { status: 'Not A Status', reasons: [], termination: [] },
    });
    expect(invalidRoleUpdateResponse.statusCode).toBe(400);
  });

  test('writes skip reasons when transitioning to Skipped', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    await app.inject({
      method: 'PATCH',
      url: `/api/roles/${id}/status`,
      payload: { status: 'Skipped', reasons: ['Compensation'], termination: [] },
    });

    const updatedRoleResponse = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(updatedRoleResponse.json().skip_reasons).toHaveLength(1);
    expect(updatedRoleResponse.json().skip_reasons[0].reason).toBe('Compensation');
  });

  test('writes termination reasons when transitioning to Closed', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    await app.inject({
      method: 'PATCH',
      url: `/api/roles/${id}/status`,
      payload: { status: 'Closed', reasons: [], termination: ['Filled'] },
    });

    const updatedRoleResponse = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(updatedRoleResponse.json().termination_reasons).toHaveLength(1);
    expect(updatedRoleResponse.json().termination_reasons[0].reason).toBe('Filled');
  });
});

test('returns 400 when transitioning to Skipped with no reasons', async () => {
  const roleCreationResponse = await app.inject({
    method: 'POST',
    url: '/api/roles',
    payload: baseRole,
  });
  const { id } = roleCreationResponse.json();

  const invalidUpdateResponse = await app.inject({
    method: 'PATCH',
    url: `/api/roles/${id}/status`,
    payload: { status: 'Skipped', reasons: [], termination: [] },
  });
  expect(invalidUpdateResponse.statusCode).toBe(400);
});

test('returns 400 when transitioning to Closed with no termination reasons', async () => {
  const roleCreationResponse = await app.inject({
    method: 'POST',
    url: '/api/roles',
    payload: baseRole,
  });
  const { id } = roleCreationResponse.json();

  const invalidUpdateResponse = await app.inject({
    method: 'PATCH',
    url: `/api/roles/${id}/status`,
    payload: { status: 'Closed', reasons: [], termination: [] },
  });
  expect(invalidUpdateResponse.statusCode).toBe(400);
});

// ─── POST /api/roles/:id/skip-reasons ────────────────────────────────────────

describe('POST /api/roles/:id/skip-reasons', () => {
  test('adds a skip reason to an existing role', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const skipReasonCreationResponse = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/skip-reasons`,
      payload: { reason: 'Compensation' },
    });
    expect(skipReasonCreationResponse.statusCode).toBe(201);
    expect(typeof skipReasonCreationResponse.json().id).toBe('number');
  });

  test('returns 400 when reason is missing', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const missingSkipReasonCreationResponse = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/skip-reasons`,
      payload: {},
    });
    expect(missingSkipReasonCreationResponse.statusCode).toBe(400);
  });

  test('returns 400 for invalid reason value', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const invalidSkipReasonCreationResponse = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/skip-reasons`,
      payload: { reason: 'Not A Valid Reason' },
    });
    expect(invalidSkipReasonCreationResponse.statusCode).toBe(400);
  });

  test('returns 404 for unknown role ID', async () => {
    const invalidSkipReasonCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles/99999/skip-reasons',
      payload: { reason: 'Compensation' },
    });
    expect(invalidSkipReasonCreationResponse.statusCode).toBe(404);
  });
});

// ─── POST /api/roles/:id/termination-reasons ─────────────────────────────────

describe('POST /api/roles/:id/termination-reasons', () => {
  test('adds a termination reason to an existing role', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const terminationReasonCreationResponse = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/termination-reasons`,
      payload: { reason: 'Filled' },
    });
    expect(terminationReasonCreationResponse.statusCode).toBe(201);
    expect(typeof terminationReasonCreationResponse.json().id).toBe('number');
  });

  test('returns 400 when reason is missing', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const missingTerminationReasonCreationResponse = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/termination-reasons`,
      payload: {},
    });
    expect(missingTerminationReasonCreationResponse.statusCode).toBe(400);
  });

  test('returns 400 for invalid reason value', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const invalidTerminationReasonCreationResponse = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/termination-reasons`,
      payload: { reason: 'Not A Valid Reason' },
    });
    expect(invalidTerminationReasonCreationResponse.statusCode).toBe(400);
  });

  test('returns 404 for unknown role ID', async () => {
    const rejected = await app.inject({
      method: 'POST',
      url: '/api/roles/99999/termination-reasons',
      payload: { reason: 'Filled' },
    });
    expect(rejected.statusCode).toBe(404);
  });
});

// ─── GET /api/roles/:id/export ───────────────────────────────────────────────

describe('GET /api/roles/:id/export', () => {
  test('returns 200 with content string and format for simple export', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const exportResponse = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/export`,
    });
    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.json().format).toBe('simple');
    expect(typeof exportResponse.json().content).toBe('string');
  });

  test('respects format param', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const exportResponse = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/export?format=rich`,
    });
    expect(exportResponse.json().format).toBe('rich');
  });

  test('falls back to simple for invalid format', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const exportResponse = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/export?format=invalid`,
    });
    expect(exportResponse.json().format).toBe('simple');
  });

  test('returns 404 for unknown ID', async () => {
    const invalidExportRequest = await app.inject({
      method: 'GET',
      url: '/api/roles/99999/export',
    });
    expect(invalidExportRequest.statusCode).toBe(404);
  });
});

// ─── GET /api/roles/:id/preview-delete ───────────────────────────────────────

describe('GET /api/roles/:id/preview-delete', () => {
  test('returns dependent counts for a role', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const previewResponse = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/preview-delete`,
    });
    expect(previewResponse.statusCode).toBe(200);

    const preview = previewResponse.json();
    expect(preview.role.id).toBe(id);
    expect(preview.skip_reasons).toHaveLength(0);
    expect(preview.termination_reasons).toHaveLength(0);
    expect(preview.job_descriptions).toHaveLength(1);
  });

  test('returns correct dependent counts for a role with skip_reason dependents', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: skippedRole,
    });
    const { id } = roleCreationResponse.json();

    const previewResponse = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/preview-delete`,
    });
    const preview = previewResponse.json();
    expect(preview.skip_reasons).toHaveLength(1);
    expect(preview.termination_reasons).toHaveLength(0);
  });

  test('returns correct dependent counts for a role with termination_reason dependents', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: closedRole,
    });
    const { id } = roleCreationResponse.json();

    const previewResponse = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/preview-delete`,
    });
    const preview = previewResponse.json();
    expect(preview.skip_reasons).toHaveLength(0);
    expect(preview.termination_reasons).toHaveLength(1);
  });

  test('returns 404 for unknown ID', async () => {
    const invalidPreviewResponse = await app.inject({
      method: 'GET',
      url: '/api/roles/99999/preview-delete',
    });
    expect(invalidPreviewResponse.statusCode).toBe(404);
  });
});

// ─── DELETE /api/roles/:id ────────────────────────────────────────────────────

describe('DELETE /api/roles/:id', () => {
  test('returns 400 when role has dependents and force is not set. Role is not deleted.', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: skippedRole,
    });
    const { id } = roleCreationResponse.json();

    const invalidRoleDeletionResponse = await app.inject({
      method: 'DELETE',
      url: `/api/roles/${id}`,
    });
    expect(invalidRoleDeletionResponse.statusCode).toBe(400);

    const roleExistenceCheck = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(roleExistenceCheck.statusCode).toBe(200);
  });

  test('successfully deletes role and dependents with force=true', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: skippedRole,
    });
    const { id } = roleCreationResponse.json();

    const roleDeletionResponse = await app.inject({
      method: 'DELETE',
      url: `/api/roles/${id}?force=true`,
    });
    expect(roleDeletionResponse.statusCode).toBe(200);

    const roleExistenceCheck = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(roleExistenceCheck.statusCode).toBe(404);
  });

  test('successfully deletes role with no dependents without force', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = roleCreationResponse.json();

    const roleDeletionResponse = await app.inject({
      method: 'DELETE',
      url: `/api/roles/${id}`,
    });
    expect(roleDeletionResponse.statusCode).toBe(200);

    const roleExistenceCheck = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(roleExistenceCheck.statusCode).toBe(404);
  });
});

// ─── DELETE /api/skip-reasons/:id ────────────────────────────────────────────

describe('DELETE /api/skip-reasons/:id', () => {
  test('deletes an existing skip reason', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const roleId = roleCreationResponse.json().id;

    const skipReasonCreationResponse = await app.inject({
      method: 'POST',
      url: `/api/roles/${roleId}/skip-reasons`,
      payload: { reason: 'Compensation' },
    });
    const reasonId = skipReasonCreationResponse.json().id;

    const skipReasonDeletionResponse = await app.inject({
      method: 'DELETE',
      url: `/api/roles/skip-reasons/${reasonId}`,
    });
    expect(skipReasonDeletionResponse.statusCode).toBe(200);

    const getRoleResponse = await app.inject({ method: 'GET', url: `/api/roles/${roleId}` });
    const role = getRoleResponse.json();
    expect(role.skip_reasons.find((r: { id: number }) => r.id === reasonId)).toBeUndefined();
  });

  test('returns 404 for unknown skip reason ID', async () => {
    const invalidSkipReasonDeletionRequest = await app.inject({
      method: 'DELETE',
      url: '/api/roles/skip-reasons/99999',
    });
    expect(invalidSkipReasonDeletionRequest.statusCode).toBe(404);
  });
});

// ─── DELETE /api/termination-reasons/:id ─────────────────────────────────────

describe('DELETE /api/termination-reasons/:id', () => {
  test('deletes an existing termination reason', async () => {
    const roleCreationResponse = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const roleId = roleCreationResponse.json().id;

    const terminationReasonCreationResponse = await app.inject({
      method: 'POST',
      url: `/api/roles/${roleId}/termination-reasons`,
      payload: { reason: 'Filled' },
    });
    const reasonId = terminationReasonCreationResponse.json().id;

    const terminationReasonDeletionResponse = await app.inject({
      method: 'DELETE',
      url: `/api/roles/termination-reasons/${reasonId}`,
    });
    expect(terminationReasonDeletionResponse.statusCode).toBe(200);

    const roleExistenceCheck = await app.inject({ method: 'GET', url: `/api/roles/${roleId}` });
    const role = roleExistenceCheck.json();
    expect(role.termination_reasons.find((r: { id: number }) => r.id === reasonId)).toBeUndefined();
  });

  test('returns 404 for unknown termination reason ID', async () => {
    const invalidTerminationReasonDeletionResponse = await app.inject({
      method: 'DELETE',
      url: '/api/roles/termination-reasons/99999',
    });
    expect(invalidTerminationReasonDeletionResponse.statusCode).toBe(404);
  });
});
