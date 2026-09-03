// tests/integration/routes/job-stubs.test.ts

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { createTestDb } from '../../helpers/db';
import { jobStubsRouter } from '../../../server/routes/job-stubs';
import { addRole } from '../../../lib/roles';
import { db } from '../../../lib/db';

let app: FastifyInstance;
let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = createTestDb();
  app = Fastify();
  await app.register(jobStubsRouter, { prefix: '/api/job-stubs', db: sqlite });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  sqlite.close();
});

describe('GET /api/job-stubs', () => {
  test('returns an empty array when there are no stubs', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  test('returns all stubs, most recently created first', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/2' },
    });

    const response = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    const stubs = response.json();
    expect(stubs).toHaveLength(2);
    expect(stubs[0].url).toBe('https://example.com/jobs/2');
    expect(stubs[1].url).toBe('https://example.com/jobs/1');
  });
});

describe('POST /api/job-stubs', () => {
  test('creates a stub and returns 201 with an id', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1?utm_source=linkedin' },
    });
    expect(response.statusCode).toBe(201);
    expect(typeof response.json().id).toBe('number');
  });

  test('stores the URL cleansed, not as submitted', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'HTTP://Example.com/jobs/1/?utm_source=linkedin' },
    });
    const { id } = createResponse.json();

    const listResponse = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    const stub = listResponse.json().find((s: { id: number }) => s.id === id);
    expect(stub.url).toBe('https://example.com/jobs/1');
  });

  test('missing url returns 400', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/job-stubs', payload: {} });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBeTruthy();
  });

  test('empty string url returns 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: '   ' },
    });
    expect(response.statusCode).toBe(400);
  });

  test('invalid (unparseable) url returns 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'not a url' },
    });
    expect(response.statusCode).toBe(400);
  });

  test('duplicate url (even differently decorated) returns 409', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'http://EXAMPLE.com/jobs/1/?utm_source=x' },
    });
    expect(response.statusCode).toBe(409);
  });

  test('a url already promoted to a role returns 409', async () => {
    addRole(sqlite, {
      company: 'Acme',
      title: 'Eng',
      url: 'https://example.com/jobs/2',
      role_status: 'Resume Needed',
      jd: 'A job.',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/2' },
    });
    expect(response.statusCode).toBe(409);
  });
});

describe('DELETE /api/job-stubs/:id', () => {
  test('deletes an existing stub and returns 204', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const deleteResponse = await app.inject({ method: 'DELETE', url: `/api/job-stubs/${id}` });
    expect(deleteResponse.statusCode).toBe(204);

    const listResponse = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    expect(listResponse.json()).toEqual([]);
  });

  test('a nonexistent id returns 404', async () => {
    const response = await app.inject({ method: 'DELETE', url: '/api/job-stubs/9999' });
    expect(response.statusCode).toBe(404);
  });
});

describe('POST /api/job-stubs/:id/promote', () => {
  const validRole = {
    company: 'Acme',
    title: 'Engineer',
    url: 'https://example.com/jobs/1',
    role_status: 'Resume Needed',
    jd: 'Do engineering things.',
  };

  test('promotes a stub to a role and returns 201 with a roleId', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const promoteResponse = await app.inject({
      method: 'POST',
      url: `/api/job-stubs/${id}/promote`,
      payload: validRole,
    });
    expect(promoteResponse.statusCode).toBe(201);
    expect(typeof promoteResponse.json().roleId).toBe('number');
  });

  test('the stub no longer appears in the list after promotion', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();
    await app.inject({ method: 'POST', url: `/api/job-stubs/${id}/promote`, payload: validRole });

    const listResponse = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    expect(listResponse.json()).toEqual([]);
  });

  test('the promoted role is actually queryable afterward', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();
    const promoteResponse = await app.inject({
      method: 'POST',
      url: `/api/job-stubs/${id}/promote`,
      payload: validRole,
    });
    const { roleId } = promoteResponse.json();

    const role = db.roles.getById(sqlite, roleId);
    expect(role?.company).toBe('Acme');
  });

  test('a nonexistent stub id returns 404', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/job-stubs/9999/promote',
      payload: validRole,
    });
    expect(response.statusCode).toBe(404);
  });

  test('a failed promotion leaves the stub intact (rollback, over HTTP)', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const promoteResponse = await app.inject({
      method: 'POST',
      url: `/api/job-stubs/${id}/promote`,
      payload: { ...validRole, title: '' },
    });
    expect(promoteResponse.statusCode).toBe(400);

    const listResponse = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    expect(listResponse.json()).toHaveLength(1);
  });

  test('a failed promotion creates no partial role (rollback, over HTTP)', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    await app.inject({
      method: 'POST',
      url: `/api/job-stubs/${id}/promote`,
      payload: { ...validRole, title: '' },
    });

    expect(db.roles.getAll(sqlite)).toHaveLength(0);
  });
});
