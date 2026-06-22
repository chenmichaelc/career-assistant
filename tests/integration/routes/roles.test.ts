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
    const res = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    expect(res.statusCode).toBe(201);
    expect(typeof res.json().id).toBe('number');
    expect(res.json().id).toBeGreaterThan(0);
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { company: 'Acme Corp' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBeDefined();
  });

  test('returns 400 when role_status is Skipped with no skip_reasons', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, role_status: 'Skipped' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when role_status is Closed with no termination_reasons', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, role_status: 'Closed' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 when role_status is Applied with no applied_date', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, role_status: 'Applied' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('creates a skipped role with skip reasons', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: skippedRole,
    });
    expect(res.statusCode).toBe(201);
  });

  test('creates a closed role with termination reasons', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: closedRole,
    });
    expect(res.statusCode).toBe(201);
  });
});

// ─── GET /api/roles ───────────────────────────────────────────────────────────

describe('GET /api/roles', () => {
  test('returns empty array when no roles exist', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/roles' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  test('returns all roles with skip_reasons and termination_reasons arrays', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    const res = await app.inject({ method: 'GET', url: '/api/roles' });
    expect(res.statusCode).toBe(200);
    const roles = res.json();
    expect(roles).toHaveLength(1);
    expect(Array.isArray(roles[0].skip_reasons)).toBe(true);
    expect(Array.isArray(roles[0].termination_reasons)).toBe(true);
  });

  test('returns skip reasons attached to the correct role', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: skippedRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    const res = await app.inject({ method: 'GET', url: '/api/roles' });
    const roles = res.json();
    const skipped = roles.find((r: { role_status: string }) => r.role_status === 'Skipped');
    const pending = roles.find((r: { role_status: string }) => r.role_status === 'Pending Triage');
    expect(skipped.skip_reasons).toHaveLength(1);
    expect(pending.skip_reasons).toHaveLength(0);
  });

  test('filters by status', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    await app.inject({ method: 'POST', url: '/api/roles', payload: appliedRole });
    const res = await app.inject({
      method: 'GET',
      url: '/api/roles?status[]=Applied',
    });
    const roles = res.json();
    expect(roles).toHaveLength(1);
    expect(roles[0].role_status).toBe('Applied');
  });

  test('filters by company', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: { ...baseRole, company: 'Other Co' },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/roles?company=Acme',
    });
    const roles = res.json();
    expect(roles).toHaveLength(1);
    expect(roles[0].company).toBe('Acme Corp');
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
    const res = await app.inject({
      method: 'GET',
      url: '/api/roles?sort=company&order=ASC',
    });
    const roles = res.json();
    expect(roles[0].company).toBe('Alpha');
    expect(roles[1].company).toBe('Zebra');
  });

  test('ignores invalid sort keys and falls back to id', async () => {
    await app.inject({ method: 'POST', url: '/api/roles', payload: baseRole });
    const res = await app.inject({
      method: 'GET',
      url: '/api/roles?sort=malicious_column',
    });
    expect(res.statusCode).toBe(200);
  });
});

// ─── GET /api/roles/:id ───────────────────────────────────────────────────────

describe('GET /api/roles/:id', () => {
  test('returns role with jd, skip_reasons, and termination_reasons', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: skippedRole,
    });
    const { id } = created.json();

    const res = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(res.statusCode).toBe(200);
    const role = res.json();
    expect(role.id).toBe(id);
    expect(role.jd).toBe(skippedRole.jd);
    expect(Array.isArray(role.skip_reasons)).toBe(true);
    expect(role.skip_reasons).toHaveLength(1);
    expect(Array.isArray(role.termination_reasons)).toBe(true);
  });

  test('returns 404 for unknown ID', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/roles/99999' });
    expect(res.statusCode).toBe(404);
  });
});

// ─── PATCH /api/roles/:id/status ─────────────────────────────────────────────

describe('PATCH /api/roles/:id/status', () => {
  test('updates role status', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/roles/${id}/status`,
      payload: { status: 'Resume Ready', reasons: [], termination: [] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role.role_status).toBe('Resume Ready');
  });

  test('returns 400 on invalid status', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/roles/${id}/status`,
      payload: { status: 'Not A Status', reasons: [], termination: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  test('writes skip reasons when transitioning to Skipped', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    await app.inject({
      method: 'PATCH',
      url: `/api/roles/${id}/status`,
      payload: { status: 'Skipped', reasons: ['Compensation'], termination: [] },
    });

    const res = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(res.json().skip_reasons).toHaveLength(1);
    expect(res.json().skip_reasons[0].reason).toBe('Compensation');
  });

  test('writes termination reasons when transitioning to Closed', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    await app.inject({
      method: 'PATCH',
      url: `/api/roles/${id}/status`,
      payload: { status: 'Closed', reasons: [], termination: ['Filled'] },
    });

    const res = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(res.json().termination_reasons).toHaveLength(1);
    expect(res.json().termination_reasons[0].reason).toBe('Filled');
  });
});

// ─── POST /api/roles/:id/skip-reasons ────────────────────────────────────────

describe('POST /api/roles/:id/skip-reasons', () => {
  test('adds a skip reason to an existing role', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/skip-reasons`,
      payload: { reason: 'Compensation' },
    });
    expect(res.statusCode).toBe(201);
    expect(typeof res.json().id).toBe('number');
  });

  test('returns 400 when reason is missing', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/skip-reasons`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for invalid reason value', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/skip-reasons`,
      payload: { reason: 'Not A Valid Reason' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('returns 404 for unknown role ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/roles/99999/skip-reasons',
      payload: { reason: 'Compensation' },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ─── POST /api/roles/:id/termination-reasons ─────────────────────────────────

describe('POST /api/roles/:id/termination-reasons', () => {
  test('adds a termination reason to an existing role', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/termination-reasons`,
      payload: { reason: 'Filled' },
    });
    expect(res.statusCode).toBe(201);
    expect(typeof res.json().id).toBe('number');
  });

  test('returns 400 when reason is missing', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/termination-reasons`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  test('returns 400 for invalid reason value', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/roles/${id}/termination-reasons`,
      payload: { reason: 'Not A Valid Reason' },
    });
    expect(res.statusCode).toBe(400);
  });

  test('returns 404 for unknown role ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/roles/99999/termination-reasons',
      payload: { reason: 'Filled' },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ─── GET /api/roles/:id/export ───────────────────────────────────────────────

describe('GET /api/roles/:id/export', () => {
  test('returns content and format for simple export', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/export`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().format).toBe('simple');
    expect(typeof res.json().content).toBe('string');
  });

  test('respects format param', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/export?format=rich`,
    });
    expect(res.json().format).toBe('rich');
  });

  test('falls back to simple for invalid format', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/export?format=invalid`,
    });
    expect(res.json().format).toBe('simple');
  });

  test('returns 404 for unknown ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/roles/99999/export',
    });
    expect(res.statusCode).toBe(404);
  });
});

// ─── GET /api/roles/:id/preview-delete ───────────────────────────────────────

describe('GET /api/roles/:id/preview-delete', () => {
  test('returns dependent counts for a role', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'GET',
      url: `/api/roles/${id}/preview-delete`,
    });
    expect(res.statusCode).toBe(200);
  });

  test('returns 404 for unknown ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/roles/99999/preview-delete',
    });
    expect(res.statusCode).toBe(404);
  });
});

// ─── DELETE /api/roles/:id ────────────────────────────────────────────────────

describe('DELETE /api/roles/:id', () => {
  test('returns 400 when role has dependents and force is not set. Role is not deleted.', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: skippedRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/roles/${id}`,
    });
    expect(res.statusCode).toBe(400);

    const check = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(check.statusCode).toBe(200);
  });

  test('deletes role and dependents with force=true', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: skippedRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/roles/${id}?force=true`,
    });
    expect(res.statusCode).toBe(200);

    const check = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(check.statusCode).toBe(404);
  });

  test('deletes role with no dependents without force', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const { id } = created.json();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/roles/${id}`,
    });
    expect(res.statusCode).toBe(200);

    const check = await app.inject({ method: 'GET', url: `/api/roles/${id}` });
    expect(check.statusCode).toBe(404);
  });
});

// ─── DELETE /api/skip-reasons/:id ────────────────────────────────────────────

describe('DELETE /api/skip-reasons/:id', () => {
  test('deletes an existing skip reason', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const roleId = created.json().id;

    const added = await app.inject({
      method: 'POST',
      url: `/api/roles/${roleId}/skip-reasons`,
      payload: { reason: 'Compensation' },
    });
    const reasonId = added.json().id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/roles/skip-reasons/${reasonId}`,
    });
    expect(res.statusCode).toBe(200);

    const check = await app.inject({ method: 'GET', url: `/api/roles/${roleId}` });
    const role = check.json();
    expect(role.skip_reasons.find((r: { id: number }) => r.id === reasonId)).toBeUndefined();
  });

  test('returns 404 for unknown skip reason ID', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/roles/skip-reasons/99999',
    });
    expect(res.statusCode).toBe(404);
  });
});

// ─── DELETE /api/termination-reasons/:id ─────────────────────────────────────

describe('DELETE /api/termination-reasons/:id', () => {
  test('deletes an existing termination reason', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/roles',
      payload: baseRole,
    });
    const roleId = created.json().id;

    const added = await app.inject({
      method: 'POST',
      url: `/api/roles/${roleId}/termination-reasons`,
      payload: { reason: 'Filled' },
    });
    const reasonId = added.json().id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/roles/termination-reasons/${reasonId}`,
    });
    expect(res.statusCode).toBe(200);

    const check = await app.inject({ method: 'GET', url: `/api/roles/${roleId}` });
    const role = check.json();
    expect(role.termination_reasons.find((r: { id: number }) => r.id === reasonId)).toBeUndefined();
  });

  test('returns 404 for unknown termination reason ID', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/roles/termination-reasons/99999',
    });
    expect(res.statusCode).toBe(404);
  });
});
