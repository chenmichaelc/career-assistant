// server/routes/admin.ts
// Career Assistant — Admin endpoints

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';
import { cleanupTestRoles } from '../../lib/admin';
import { TEST_COMPANIES } from '../../e2e/fixtures/roles';

interface PluginOptions extends FastifyPluginOptions {
  db: Database.Database;
}

export async function adminRouter(fastify: FastifyInstance, options: PluginOptions) {
  const sqlite = options.db;

  // ─── POST /api/admin/cleanup ──────────────────────────────────────────────

  fastify.post('/cleanup', async (_request, reply) => {
    try {
      const result = cleanupTestRoles(sqlite, TEST_COMPANIES);
      return result;
    } catch (err) {
      fastify.log.error(err, 'Cleanup failed');
      return reply.status(500).send({ error: 'Cleanup failed' });
    }
  });
}
