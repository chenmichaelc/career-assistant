// server/routes/job-stubs.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';
import { addStub, DuplicateStubUrlError, DuplicateRoleUrlError } from '../../lib/job-stubs';
import { InvalidUrlError } from '../../lib/url-cleanse';
import { db } from '../../lib/db';

interface PluginOptions extends FastifyPluginOptions {
  db: Database.Database;
}

export async function jobStubsRouter(fastify: FastifyInstance, options: PluginOptions) {
  const sqlite = options.db;

  // ─── GET /api/job-stubs ─────────────────────────────────────────────────────

  fastify.get('/', async () => {
    return db.jobStubs.getAll(sqlite);
  });

  // ─── POST /api/job-stubs ────────────────────────────────────────────────────

  fastify.post('/', async (request, reply) => {
    const { url } = request.body as { url?: string };

    if (url == null || url.trim() === '') {
      return reply.status(400).send({ error: 'url is required.' });
    }

    try {
      const id = addStub(sqlite, url);
      return reply.status(201).send({ id });
    } catch (err) {
      if (err instanceof InvalidUrlError) {
        return reply.status(400).send({ error: (err as Error).message });
      }
      if (err instanceof DuplicateStubUrlError || err instanceof DuplicateRoleUrlError) {
        return reply.status(409).send({ error: (err as Error).message });
      }
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── DELETE /api/job-stubs/:id ───────────────────────────────────────────────

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const stubId = parseInt(id, 10);

    const stub = db.jobStubs.getById(sqlite, stubId);
    if (stub == null) {
      return reply.status(404).send({ error: `No job stub found with id ${stubId}.` });
    }

    db.jobStubs.deleteById(sqlite, stubId);
    return reply.status(204).send();
  });
}
