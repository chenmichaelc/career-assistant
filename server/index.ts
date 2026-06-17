// server/index.ts
// Career Assistant — Fastify API Server

import Fastify from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import path from 'path';
import { applySchema } from '../db/setup';
import { rolesRouter } from './routes/roles';
import { queryRouter } from './routes/query';
import { backupRouter } from './routes/backup';

const dbPath = process.env.DB_PATH ?? path.join(__dirname, '../db/career-assistant.sqlite');
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const fastify = Fastify({ logger: true });
const db = new Database(dbPath);

if (process.env.DB_PATH) {
  applySchema(db);
}

fastify.register(cors, { origin: corsOrigin });

fastify.get('/healthcheck', async () => ({ status: 'ok' }));

fastify.register(rolesRouter, { prefix: '/api/roles', db });
fastify.register(queryRouter, { prefix: '/api/query', db });
fastify.register(backupRouter, { prefix: '/api/backup', db });

fastify.listen({ port: 3000, host: '127.0.0.1' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
