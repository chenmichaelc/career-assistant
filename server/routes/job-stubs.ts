// server/routes/job-stubs.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';
import {
  addStub,
  importParsedFields,
  patchParsedFields,
  updateJobStubStatus,
  updateRawContent,
  DuplicateStubUrlError,
  DuplicateRoleUrlError,
  JobStubNotFoundError,
  InvalidParsedFieldsError,
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
    const { url, raw_content: rawContent } = request.body as {
      url?: string;
      raw_content?: unknown;
    };

    if (url == null || url.trim() === '') {
      return reply.status(400).send({ error: 'url is required.' });
    }
    if (rawContent != null && typeof rawContent !== 'string') {
      return reply.status(400).send({ error: 'raw_content must be a string.' });
    }

    try {
      const id = addStub(sqlite, url, rawContent ?? undefined);
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

  // ─── GET /api/job-stubs/:id ──────────────────────────────────────────────────

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const stub = db.jobStubs.getById(sqlite, parseInt(id, 10));
    if (stub == null) {
      return reply.status(404).send({ error: `No job stub found with id ${id}.` });
    }
    return stub;
  });

  // ─── POST /api/job-stubs/:id/import ─────────────────────────────────────────

  fastify.post('/:id/import', async (request, reply) => {
    const { id } = request.params as { id: string };
    const stubId = parseInt(id, 10);

    try {
      const stub = importParsedFields(sqlite, stubId, request.body);
      return reply.status(200).send(stub);
    } catch (err) {
      if (err instanceof JobStubNotFoundError) {
        return reply.status(404).send({ error: err.message });
      }
      if (err instanceof InvalidParsedFieldsError) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── PATCH /api/job-stubs/:id/parsed-fields ──────────────────────────────────

  fastify.patch('/:id/parsed-fields', async (request, reply) => {
    const { id } = request.params as { id: string };
    const stubId = parseInt(id, 10);

    try {
      const stub = patchParsedFields(sqlite, stubId, request.body);
      return reply.status(200).send(stub);
    } catch (err) {
      if (err instanceof JobStubNotFoundError) {
        return reply.status(404).send({ error: err.message });
      }
      if (err instanceof InvalidParsedFieldsError) {
        return reply.status(400).send({ error: err.message });
      }
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── PATCH /api/job-stubs/:id/status ─────────────────────────────────────────

  fastify.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const stubId = parseInt(id, 10);
    const { status } = request.body as { status?: string };

    if (status == null || status.trim() === '') {
      return reply.status(400).send({ error: 'status is required.' });
    }

    try {
      const stub = updateJobStubStatus(sqlite, stubId, status);
      return reply.status(200).send(stub);
    } catch (err) {
      if (err instanceof JobStubNotFoundError) {
        return reply.status(404).send({ error: err.message });
      }
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── PATCH /api/job-stubs/:id/raw-content ────────────────────────────────────

  fastify.patch('/:id/raw-content', async (request, reply) => {
    const { id } = request.params as { id: string };
    const stubId = parseInt(id, 10);
    const { raw_content: rawContent } = request.body as { raw_content?: string };

    if (rawContent == null) {
      return reply.status(400).send({ error: 'raw_content is required.' });
    }

    try {
      const stub = updateRawContent(sqlite, stubId, rawContent);
      return reply.status(200).send(stub);
    } catch (err) {
      if (err instanceof JobStubNotFoundError) {
        return reply.status(404).send({ error: err.message });
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
