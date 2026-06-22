// server/routes/roles.ts
// Career Assistant — Role API endpoints

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';
import { addRole } from '../../lib/roles';
import { updateRole } from '../../lib/updates';
import {
  deleteRole,
  deleteSkipReason,
  deleteTerminationReason,
  deleteJobDescription,
  previewRoleDeletion,
} from '../../lib/deletes';
import { exportRole } from '../../lib/exporters';
import { ExportFormat } from '../../lib/exporters';
import {
  RoleRow,
  SkipReasonType,
  TerminationReasonType,
  VALID_SKIP_REASONS,
  VALID_TERMINATION_REASONS,
} from '../../lib/types';
import { db, SkipReasonRow, TerminationReasonRow } from '../../lib/db';
import { UpdateArgs } from '../../lib/args/update-args';

interface PluginOptions extends FastifyPluginOptions {
  db: Database.Database;
}

export async function rolesRouter(fastify: FastifyInstance, options: PluginOptions) {
  const sqlite = options.db;

  // ─── GET /api/roles ─────────────────────────────────────────────────────────

  fastify.get('/', async (request, _reply) => {
    const { company, sort, order } = request.query as {
      company?: string;
      sort?: string;
      order?: string;
    };

    const rawStatuses = (request.query as Record<string, string | string[]>)['status[]'];
    const statuses: string[] = rawStatuses
      ? Array.isArray(rawStatuses)
        ? rawStatuses
        : [rawStatuses]
      : [];

    const VALID_SORT_COLUMNS: Record<string, string> = {
      id: 'r.id',
      company: 'r.company',
      title: 'r.title',
      role_status: 'r.role_status',
      candidacy: 'r.candidacy',
      applied_date: 'r.applied_date',
    };

    const sortColumn = VALID_SORT_COLUMNS[sort ?? 'id'] ?? 'r.id';
    const sortOrder = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let query = `
      SELECT r.id, r.company, r.title, r.url, r.role_status, r.candidacy,
             r.applied_date, r.salary_min, r.salary_max, r.notes,
             r.created_at, r.updated_at
      FROM roles r
      WHERE 1=1
    `;
    const params: string[] = [];

    if (statuses.length > 0) {
      const placeholders = statuses.map(() => '?').join(', ');
      query += ` AND r.role_status IN (${placeholders})`;
      params.push(...statuses);
    }

    if (company) {
      query += ` AND r.company LIKE ?`;
      params.push(`%${company}%`);
    }

    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    const roles = sqlite.prepare(query).all(...params) as RoleRow[];

    const fetchSkipReasons = sqlite.prepare(
      `SELECT id, role_id, reason, note FROM skip_reasons WHERE role_id = ? ORDER BY id`
    );
    const fetchTerminationReasons = sqlite.prepare(
      `SELECT id, role_id, reason, note FROM termination_reasons WHERE role_id = ? ORDER BY id`
    );

    const output = roles.map((role) => ({
      ...role,
      skip_reasons: fetchSkipReasons.all(role.id) as SkipReasonRow[],
      termination_reasons: fetchTerminationReasons.all(role.id) as TerminationReasonRow[],
    }));

    return output;
  });

  // ─── GET /api/roles/:id ──────────────────────────────────────────────────────

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const role = sqlite
      .prepare(
        `
              SELECT r.id, r.company, r.title, r.url, r.role_status, r.candidacy,
                     r.applied_date, r.salary_min, r.salary_max, r.notes,
                     r.created_at, r.updated_at, jd.content AS jd
              FROM roles r
                     LEFT JOIN job_descriptions jd ON jd.role_id = r.id
              WHERE r.id = ?
            `
      )
      .get(id) as (RoleRow & { jd: string }) | undefined;

    if (!role) {
      return reply.status(404).send({ error: `No role found with ID ${id}` });
    }

    const skipReasons = sqlite
      .prepare(`SELECT id, role_id, reason, note FROM skip_reasons WHERE role_id = ? ORDER BY id`)
      .all(id) as SkipReasonRow[];
    const terminationReasons = sqlite
      .prepare(
        `SELECT id, role_id, reason, note FROM termination_reasons WHERE role_id = ? ORDER BY id`
      )
      .all(id) as TerminationReasonRow[];

    return { ...role, skip_reasons: skipReasons, termination_reasons: terminationReasons };
  });

  // ─── POST /api/roles ─────────────────────────────────────────────────────────

  fastify.post('/', async (request, reply) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validation via Zod tracked in CAR-44
      const id = addRole(sqlite, request.body as any);
      return reply.status(201).send({ id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── PATCH /api/roles/:id/status ────────────────────────────────────────────

  fastify.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<UpdateArgs>;
    const flags: UpdateArgs = {
      id,
      status: body.status,
      reasons: body.reasons ?? [],
      termination: body.termination ?? [],
      note: body.note,
    };

    try {
      const role = updateRole(sqlite, flags);
      return { role };
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── POST /api/roles/:id/skip-reasons ───────────────────────────────────────

  fastify.post('/:id/skip-reasons', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason, note } = request.body as { reason: string; note?: string };

    if (!reason || reason.trim() === '') {
      return reply.status(400).send({ error: 'reason is required.' });
    }

    if (!VALID_SKIP_REASONS.includes(reason.trim() as SkipReasonType)) {
      return reply.status(400).send({
        error: `Invalid skip reason: "${reason}". Valid values: ${VALID_SKIP_REASONS.join(', ')}.`,
      });
    }

    if (!db.roles.getById(sqlite, Number(id))) {
      return reply.status(404).send({ error: `No role found with ID ${id}.` });
    }

    const result = sqlite
      .prepare(`INSERT INTO skip_reasons (role_id, reason, note) VALUES (?, ?, ?)`)
      .run(id, reason.trim(), note?.trim() ?? null);

    return reply.status(201).send({ id: result.lastInsertRowid });
  });

  // ─── POST /api/roles/:id/termination-reasons ────────────────────────────────

  fastify.post('/:id/termination-reasons', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason, note } = request.body as { reason: string; note?: string };

    if (!reason || reason.trim() === '') {
      return reply.status(400).send({ error: 'reason is required.' });
    }

    if (!VALID_TERMINATION_REASONS.includes(reason.trim() as TerminationReasonType)) {
      return reply.status(400).send({
        error: `Invalid termination reason: "${reason}". Valid values: ${VALID_TERMINATION_REASONS.join(', ')}.`,
      });
    }

    if (!db.roles.getById(sqlite, Number(id))) {
      return reply.status(404).send({ error: `No role found with ID ${id}.` });
    }

    const result = sqlite
      .prepare(`INSERT INTO termination_reasons (role_id, reason, note) VALUES (?, ?, ?)`)
      .run(id, reason.trim(), note?.trim() ?? null);

    return reply.status(201).send({ id: result.lastInsertRowid });
  });

  // ─── DELETE /api/roles/:id ───────────────────────────────────────────────────

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { force } = request.query as { force?: string };

    try {
      const result = deleteRole(sqlite, parseInt(id, 10), force === 'true');
      return result;
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── GET /api/roles/:id/preview-delete ──────────────────────────────────────

  fastify.get('/:id/preview-delete', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return previewRoleDeletion(sqlite, parseInt(id, 10));
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  // ─── GET /api/roles/:id/export ───────────────────────────────────────────────

  fastify.get('/:id/export', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { format } = request.query as { format?: string };

    const row = sqlite
      .prepare(
        `
              SELECT r.id, r.company, r.title, r.url, r.role_status, r.candidacy,
                     r.applied_date, r.salary_min, r.salary_max, r.notes,
                     r.created_at, r.updated_at, jd.content AS jd
              FROM roles r
                     LEFT JOIN job_descriptions jd ON jd.role_id = r.id
              WHERE r.id = ?
            `
      )
      .get(id) as (RoleRow & { jd: string }) | undefined;

    if (!row) {
      return reply.status(404).send({ error: `No role found with ID ${id}` });
    }

    const validFormats: ExportFormat[] = ['simple', 'rich'];
    const fmt = (validFormats.includes(format as ExportFormat) ? format : 'simple') as ExportFormat;

    return { content: exportRole(row, fmt), format: fmt };
  });

  // ─── DELETE /api/skip-reasons/:id ────────────────────────────────────────────

  fastify.delete('/skip-reasons/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return deleteSkipReason(sqlite, parseInt(id, 10));
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  // ─── DELETE /api/termination-reasons/:id ─────────────────────────────────────

  fastify.delete('/termination-reasons/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return deleteTerminationReason(sqlite, parseInt(id, 10));
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  // ─── DELETE /api/roles/:id/job-description ───────────────────────────────────

  fastify.delete('/:id/job-description', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return deleteJobDescription(sqlite, parseInt(id, 10));
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });
}
