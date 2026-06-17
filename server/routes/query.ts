// server/routes/query.ts
// Career Assistant — Raw SQL query endpoint

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';

interface PluginOptions extends FastifyPluginOptions {
  db: Database.Database;
}

export async function queryRouter(fastify: FastifyInstance, options: PluginOptions) {
  const db = options.db;

  fastify.post('/', async (request, reply) => {
    const { sql, writeMode } = request.body as { sql: string; writeMode: boolean };

    if (!sql || sql.trim() === '') {
      return reply.status(400).send({ error: 'SQL query is required.' });
    }

    const normalized = sql.trim().toUpperCase();
    const isWrite    = normalized.startsWith('INSERT') ||
                       normalized.startsWith('UPDATE') ||
                       normalized.startsWith('DELETE') ||
                       normalized.startsWith('DROP')   ||
                       normalized.startsWith('ALTER')  ||
                       normalized.startsWith('CREATE');

    if (isWrite && !writeMode) {
      return reply.status(403).send({
        error: 'Write query blocked. Enable write mode to execute INSERT, UPDATE, DELETE, DROP, ALTER, or CREATE statements.',
      });
    }

    try {
      const stmt    = db.prepare(sql);
      const results = isWrite ? stmt.run() : stmt.all();
      return { results, rowCount: Array.isArray(results) ? results.length : undefined };
    }
 catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });
}
