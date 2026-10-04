// tests/integration/routes/job-stubs.test.ts

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { createTestDb } from '../../helpers/db';
import { jobStubsRouter } from '../../../server/routes/job-stubs';
import { addRole } from '../../../lib/roles';
import { RoleInput } from '../../../lib/types';

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
    const emptyListResponse = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    expect(emptyListResponse.statusCode).toBe(200);
    expect(emptyListResponse.json()).toEqual([]);
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

    const listResponse = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    const stubs = listResponse.json();
    expect(stubs).toHaveLength(2);
    expect(stubs[0].url).toBe('https://example.com/jobs/2');
    expect(stubs[1].url).toBe('https://example.com/jobs/1');
  });
});

describe('POST /api/job-stubs', () => {
  test('creates a stub and returns 201 with an id', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1?utm_source=linkedin' },
    });
    expect(createResponse.statusCode).toBe(201);
    expect(typeof createResponse.json().id).toBe('number');
  });

  test('stores the URL cleansed, not as submitted', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'HTTP://Example.com/jobs/1/?utm_source=linkedin' },
    });
    const { id } = createResponse.json();

    const listResponse = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    const stub = listResponse.json().find((jobStub: { id: number }) => jobStub.id === id);
    expect(stub.url).toBe('https://example.com/jobs/1');
  });

  test('missing url returns 400', async () => {
    const missingUrlResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: {},
    });
    expect(missingUrlResponse.statusCode).toBe(400);
    expect(missingUrlResponse.json().error).toBeTruthy();
  });

  test('empty string url returns 400', async () => {
    const emptyUrlResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: '   ' },
    });
    expect(emptyUrlResponse.statusCode).toBe(400);
  });

  test('invalid (unparseable) url returns 400', async () => {
    const invalidUrlResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'not a url' },
    });
    expect(invalidUrlResponse.statusCode).toBe(400);
  });

  test('duplicate url (even differently decorated) returns 409', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const duplicateUrlResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'http://EXAMPLE.com/jobs/1/?utm_source=x' },
    });
    expect(duplicateUrlResponse.statusCode).toBe(409);
  });

  test('a url already promoted to a role returns 409', async () => {
    const role: RoleInput = {
      company: 'Acme',
      title: 'Eng',
      url: 'https://example.com/jobs/2',
      role_status: 'Resume Needed',
      jd: 'A job.',
    };
    addRole(sqlite, role);

    const alreadyPromotedResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: role.url },
    });
    expect(alreadyPromotedResponse.statusCode).toBe(409);
  });
});

describe('POST /api/job-stubs with raw_content', () => {
  const stubUrl = 'https://example.com/jobs/1';
  const postingText = 'Full posting text.';

  test('creates the stub with its raw content and status Scraped', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: stubUrl, raw_content: postingText },
    });
    expect(createResponse.statusCode).toBe(201);

    const stubResponse = await app.inject({
      method: 'GET',
      url: `/api/job-stubs/${createResponse.json().id}`,
    });
    expect(stubResponse.json().raw_content).toBe(postingText);
    expect(stubResponse.json().status).toBe('Scraped');
  });

  test('a URL-only request is unchanged: no raw content, status Stubbed', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: stubUrl },
    });
    const stubResponse = await app.inject({
      method: 'GET',
      url: `/api/job-stubs/${createResponse.json().id}`,
    });
    expect(stubResponse.json().raw_content).toBeNull();
    expect(stubResponse.json().status).toBe('Stubbed');
  });

  test('a duplicate URL returns 409', async () => {
    await app.inject({ method: 'POST', url: '/api/job-stubs', payload: { url: stubUrl } });
    const duplicateResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: stubUrl, raw_content: postingText },
    });
    expect(duplicateResponse.statusCode).toBe(409);
  });

  test('an invalid URL returns 400', async () => {
    const invalidUrlResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'not a url', raw_content: postingText },
    });
    expect(invalidUrlResponse.statusCode).toBe(400);
  });

  test.each([
    ['empty', ''],
    ['whitespace-only', '   \n '],
    ['not a string', 42],
  ])('%s raw_content returns 400 and creates no stub', async (_description, rawContent) => {
    const rejectedResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: stubUrl, raw_content: rawContent },
    });
    expect(rejectedResponse.statusCode).toBe(400);
    expect(rejectedResponse.json().error).toBeTruthy();

    const listResponse = await app.inject({ method: 'GET', url: '/api/job-stubs' });
    expect(listResponse.json()).toHaveLength(0);
  });
});

describe('POST /api/job-stubs/:id/import', () => {
  test('imports valid parsed fields and returns 200 with the updated stub', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const importResponse = await app.inject({
      method: 'POST',
      url: `/api/job-stubs/${id}/import`,
      payload: { company: 'Acme', title: 'Eng', in_office_expectation: 'Hybrid' },
    });

    expect(importResponse.statusCode).toBe(200);
    expect(importResponse.json().parsed_company).toBe('Acme');
    expect(importResponse.json().status).toBe('Parsed');
  });

  test('an invalid enum value returns 400 with field-level issues', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const importResponse = await app.inject({
      method: 'POST',
      url: `/api/job-stubs/${id}/import`,
      payload: { in_office_expectation: 'Not A Real Value' },
    });

    expect(importResponse.statusCode).toBe(400);
    expect(importResponse.json().error).toContain('in_office_expectation');
  });

  test('a nonexistent stub id returns 404', async () => {
    const importResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs/9999/import',
      payload: {},
    });
    expect(importResponse.statusCode).toBe(404);
  });
});

describe('GET /api/job-stubs/:id', () => {
  test('returns the matching stub', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const getResponse = await app.inject({ method: 'GET', url: `/api/job-stubs/${id}` });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json().url).toBe('https://example.com/jobs/1');
  });

  test('a nonexistent id returns 404', async () => {
    const getResponse = await app.inject({ method: 'GET', url: '/api/job-stubs/9999' });
    expect(getResponse.statusCode).toBe(404);
  });
});

describe('PATCH /api/job-stubs/:id/parsed-fields', () => {
  test('patches only the provided fields and returns 200 with the updated stub', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();
    await app.inject({
      method: 'POST',
      url: `/api/job-stubs/${id}/import`,
      payload: { company: 'Acme', title: 'Eng' },
    });

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/job-stubs/${id}/parsed-fields`,
      payload: { company: 'Updated Co' },
    });

    expect(patchResponse.statusCode).toBe(200);
    expect(patchResponse.json().parsed_company).toBe('Updated Co');
    expect(patchResponse.json().parsed_title).toBe('Eng');
  });

  test('does not advance status', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/job-stubs/${id}/parsed-fields`,
      payload: { company: 'Acme' },
    });

    expect(patchResponse.json().status).toBe('Stubbed');
  });

  test('an invalid enum value returns 400', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/job-stubs/${id}/parsed-fields`,
      payload: { candidacy: 'Not A Real Value' },
    });

    expect(patchResponse.statusCode).toBe(400);
  });

  test('a nonexistent stub id returns 404', async () => {
    const patchResponse = await app.inject({
      method: 'PATCH',
      url: '/api/job-stubs/9999/parsed-fields',
      payload: { company: 'Acme' },
    });
    expect(patchResponse.statusCode).toBe(404);
  });
});

describe('PATCH /api/job-stubs/:id/status', () => {
  test('updates the status and returns 200 with the updated stub', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const statusResponse = await app.inject({
      method: 'PATCH',
      url: `/api/job-stubs/${id}/status`,
      payload: { status: 'Ready to Promote' },
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json().status).toBe('Ready to Promote');
  });

  test('missing status returns 400', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const statusResponse = await app.inject({
      method: 'PATCH',
      url: `/api/job-stubs/${id}/status`,
      payload: {},
    });
    expect(statusResponse.statusCode).toBe(400);
  });

  test('an invalid status value returns 400', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const statusResponse = await app.inject({
      method: 'PATCH',
      url: `/api/job-stubs/${id}/status`,
      payload: { status: 'Not A Real Value' },
    });
    expect(statusResponse.statusCode).toBe(400);
  });

  test('a nonexistent stub id returns 404', async () => {
    const statusResponse = await app.inject({
      method: 'PATCH',
      url: '/api/job-stubs/9999/status',
      payload: { status: 'Parsed' },
    });
    expect(statusResponse.statusCode).toBe(404);
  });
});

describe('PATCH /api/job-stubs/:id/raw-content', () => {
  test('updates the raw content and returns 200, without changing status', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const rawContentResponse = await app.inject({
      method: 'PATCH',
      url: `/api/job-stubs/${id}/raw-content`,
      payload: { raw_content: 'Full posting text.' },
    });

    expect(rawContentResponse.statusCode).toBe(200);
    expect(rawContentResponse.json().raw_content).toBe('Full posting text.');
    expect(rawContentResponse.json().status).toBe('Stubbed');
  });

  test('missing raw_content returns 400', async () => {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/job-stubs',
      payload: { url: 'https://example.com/jobs/1' },
    });
    const { id } = createResponse.json();

    const rawContentResponse = await app.inject({
      method: 'PATCH',
      url: `/api/job-stubs/${id}/raw-content`,
      payload: {},
    });
    expect(rawContentResponse.statusCode).toBe(400);
  });

  test('a nonexistent stub id returns 404', async () => {
    const rawContentResponse = await app.inject({
      method: 'PATCH',
      url: '/api/job-stubs/9999/raw-content',
      payload: { raw_content: 'text' },
    });
    expect(rawContentResponse.statusCode).toBe(404);
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
    const nonexistentDeleteResponse = await app.inject({
      method: 'DELETE',
      url: '/api/job-stubs/9999',
    });
    expect(nonexistentDeleteResponse.statusCode).toBe(404);
  });
});
