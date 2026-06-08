// server/routes/backup.ts
// Career Assistant — Database backup endpoint

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';
import path     from 'path';
import fs       from 'fs';

interface PluginOptions extends FastifyPluginOptions {
  db: Database.Database;
}

export async function backupRouter(fastify: FastifyInstance, options: PluginOptions) {
  const db = options.db;

  fastify.post('/', async (request, reply) => {
    const backupDir = path.join(__dirname, '../../backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp  = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `career-assistant-${timestamp}.sqlite`);

    await db.backup(backupPath);

    return { path: backupPath, timestamp };
  });
}
