// server/routes/job-stubs.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';
import {
  addStub,
  promoteStub,
  DuplicateStubUrlError,
  DuplicateRoleUrlError,
  StubNotFoundError,
} from '../../lib/job-stubs';
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

  // ─── POST /api/job-stubs/:id/promote ────────────────────────────────────────

  fastify.post('/:id/promote', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validation via Zod tracked in CAR-44, matches existing convention in server/routes/roles.ts
      const roleId = promoteStub(sqlite, parseInt(id, 10), request.body as any);
      return reply.status(201).send({ roleId });
    } catch (err) {
      if (err instanceof StubNotFoundError) {
        return reply.status(404).send({ error: (err as Error).message });
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
