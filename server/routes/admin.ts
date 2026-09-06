// server/routes/admin.ts
// Career Assistant — Admin endpoints

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';
import { cleanupTestRoles, cleanupTestStubs } from '../../lib/admin';
import { TEST_COMPANIES } from '../../e2e/fixtures/roles';
import { E2E_STUB_URL_PREFIX } from '../../e2e/fixtures/jobStubs';

interface PluginOptions extends FastifyPluginOptions {
  db: Database.Database;
}

export async function adminRouter(fastify: FastifyInstance, options: PluginOptions) {
  const sqlite = options.db;

  // ─── POST /api/admin/cleanup ──────────────────────────────────────────────

  fastify.post('/cleanup', async (_request, reply) => {
    try {
      const roles = cleanupTestRoles(sqlite, TEST_COMPANIES);
      const stubs = cleanupTestStubs(sqlite, E2E_STUB_URL_PREFIX);
      return { roles, stubs };
    } catch (err) {
      fastify.log.error(err, 'Cleanup failed');
      return reply.status(500).send({ error: 'Cleanup failed' });
    }
  });
}
