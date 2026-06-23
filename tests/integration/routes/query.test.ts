// tests/integration/routes/query.test.ts
// Career Assistant — HTTP route integration tests for POST /api/query

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import { createTestDb } from '../../helpers/db';
import { queryRouter } from '../../../server/routes/query';

let app: FastifyInstance;
let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = createTestDb();
  app = Fastify();
  await app.register(queryRouter, { prefix: '/api/query', db: sqlite });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  sqlite.close();
});

describe('POST /api/query', () => {
  test('executes a read query and returns results', async () => {
    const queryResponse = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: { sql: 'SELECT * FROM roles', writeMode: false },
    });
    expect(queryResponse.statusCode).toBe(200);
    expect(Array.isArray(queryResponse.json().results)).toBe(true);
    expect(queryResponse.json().rowCount).toBe(0);
  });

  test('returns 400 when sql is missing', async () => {
    const invalidQueryResponse = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: { writeMode: false },
    });
    expect(invalidQueryResponse.statusCode).toBe(400);
  });

  test('returns 400 when sql is empty', async () => {
    const invalidQueryResponse = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: { sql: '   ', writeMode: false },
    });
    expect(invalidQueryResponse.statusCode).toBe(400);
  });

  test('blocks write query when writeMode is false', async () => {
    const blockedQueryResponse = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: {
        sql: "INSERT INTO roles (company, title, url, role_status) VALUES ('A', 'B', 'C', 'Pending Triage')",
        writeMode: false,
      },
    });
    expect(blockedQueryResponse.statusCode).toBe(403);

    const readQueryResponse = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: { sql: 'SELECT * FROM roles', writeMode: false },
    });
    expect(readQueryResponse.json().rowCount).toBe(0);
  });

  test('executes write query when writeMode is true', async () => {
    const writeQueryResponse = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: {
        sql: "INSERT INTO roles (company, title, url, role_status) VALUES ('Acme', 'Engineer', 'https://example.com', 'Pending Triage')",
        writeMode: true,
      },
    });
    expect(writeQueryResponse.statusCode).toBe(200);

    const readQueryResponse = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: { sql: 'SELECT * FROM roles', writeMode: false },
    });
    expect(readQueryResponse.json().rowCount).toBe(1);
  });

  test('returns 400 for invalid SQL', async () => {
    // Suppressing Jetbrains linter from checking intentionally malformed SQL
    // noinspection ALL
    const invalidQueryResponse = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: { sql: 'SELECT FROM WHERE', writeMode: false },
    });
    expect(invalidQueryResponse.statusCode).toBe(400);
    expect(invalidQueryResponse.json().error).toBeDefined();
  });
});
