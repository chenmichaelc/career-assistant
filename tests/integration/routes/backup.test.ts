// tests/integration/routes/backup.test.ts
// Career Assistant — HTTP route integration tests for POST /api/backup

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTestDb } from '../../helpers/db';
import { backupRouter } from '../../../server/routes/backup';

let app: FastifyInstance;
let sqlite: Database.Database;
let tmpDir: string;

beforeEach(async () => {
  sqlite = createTestDb();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'career-assistant-backup-test-'));

  app = Fastify();
  await app.register(backupRouter, { prefix: '/api/backup', db: sqlite });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  sqlite.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('POST /api/backup', () => {
  test('returns 200 with path and timestamp', async () => {
    const backupResponse = await app.inject({
      method: 'POST',
      url: '/api/backup',
    });
    expect(backupResponse.statusCode).toBe(200);
    expect(typeof backupResponse.json().path).toBe('string');
    expect(typeof backupResponse.json().timestamp).toBe('string');
  });
});
