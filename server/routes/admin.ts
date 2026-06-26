// server/routes/admin.ts
// Career Assistant — Admin endpoints

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';
import { deleteRole } from '../../lib/deletes';
import { TEST_COMPANIES } from '../../e2e/fixtures/roles';

interface PluginOptions extends FastifyPluginOptions {
  db: Database.Database;
}

export async function adminRouter(fastify: FastifyInstance, options: PluginOptions) {
  const sqlite = options.db;

  // ─── POST /api/admin/cleanup ──────────────────────────────────────────────

  fastify.post('/cleanup', async (_request, reply) => {
    try {
      const placeholders = TEST_COMPANIES.map(() => '?').join(', ');
      const roles = sqlite
        .prepare(`SELECT id FROM roles WHERE company IN (${placeholders})`)
        .all(...TEST_COMPANIES) as { id: number }[];

      const deleted: number[] = [];

      for (const role of roles) {
        deleteRole(sqlite, role.id, true);
        deleted.push(role.id);
      }

      return { deleted, count: deleted.length };
    } catch (err) {
      fastify.log.error(err, 'Cleanup failed');
      return reply.status(500).send({ error: 'Cleanup failed' });
    }
  });
}
