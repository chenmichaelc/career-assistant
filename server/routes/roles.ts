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
import { exportRole, ExportFormat } from '../../lib/exporters';
import {
  RoleRow,
  SkipReasonType,
  TerminationReasonType,
  VALID_SKIP_REASONS,
  VALID_TERMINATION_REASONS,
} from '../../lib/types';
import { db, SkipReasonRow, TerminationReasonRow } from '../../lib/db';
import { RoleSortKey } from '../../lib/db/roles.db';
import { UpdateArgs } from '../../lib/args/update-args';

interface PluginOptions extends FastifyPluginOptions {
  db: Database.Database;
}

interface RoleListFilters {
  statuses: string[];
  company?: string;
  sortColumn: RoleSortKey;
  sortOrder: 'ASC' | 'DESC';
}

const VALID_SORT_KEYS: RoleSortKey[] = [
  'id',
  'company',
  'title',
  'role_status',
  'candidacy',
  'applied_date',
];

function parseRoleListFilters(query: Record<string, string | string[]>): RoleListFilters {
  const rawStatuses = query['status[]'];
  const statuses: string[] = rawStatuses
    ? Array.isArray(rawStatuses)
      ? rawStatuses
      : [rawStatuses]
    : [];

  const sort = typeof query['sort'] === 'string' ? query['sort'] : undefined;
  const order = typeof query['order'] === 'string' ? query['order'] : undefined;

  const sortColumn: RoleSortKey =
    sort && (VALID_SORT_KEYS as string[]).includes(sort) ? (sort as RoleSortKey) : 'id';
  const sortOrder: 'ASC' | 'DESC' = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const company = typeof query['company'] === 'string' ? query['company'] : undefined;

  return { statuses, company, sortColumn, sortOrder };
}

export async function rolesRouter(fastify: FastifyInstance, options: PluginOptions) {
  const sqlite = options.db;

  // ─── GET /api/roles ─────────────────────────────────────────────────────────

  fastify.get('/', async (request, _reply) => {
    const filters = parseRoleListFilters(request.query as Record<string, string | string[]>);
    const roles = db.roles.getAll(
      sqlite,
      filters.statuses,
      filters.company,
      filters.sortColumn,
      filters.sortOrder
    );

    if (roles.length === 0) {
      return [];
    }

    const roleIds = roles.map((r) => r.id);
    const allSkipReasons = db.skipReasons.getAllByRoleIds(sqlite, roleIds);
    const allTerminationReasons = db.terminationReasons.getAllByRoleIds(sqlite, roleIds);

    const skipByRoleId = Map.groupBy(allSkipReasons, (r: SkipReasonRow) => r.role_id);
    const termByRoleId = Map.groupBy(allTerminationReasons, (r: TerminationReasonRow) => r.role_id);

    return roles.map((role) => ({
      ...role,
      skip_reasons: skipByRoleId.get(role.id) ?? [],
      termination_reasons: termByRoleId.get(role.id) ?? [],
    }));
  });

  // ─── GET /api/roles/:id ──────────────────────────────────────────────────────

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numericId = Number(id);

    const role = db.roles.getById(sqlite, numericId);
    if (!role) {
      return reply.status(404).send({ error: `No role found with ID ${id}` });
    }

    const jd = db.jobDescriptions.getByRoleId(sqlite, numericId);
    const skipReasons = db.skipReasons.getAllByRoleId(sqlite, numericId);
    const terminationReasons = db.terminationReasons.getAllByRoleId(sqlite, numericId);

    return {
      ...role,
      jd: jd?.content ?? null,
      skip_reasons: skipReasons,
      termination_reasons: terminationReasons,
    };
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

    const newId = db.skipReasons.insert(sqlite, Number(id), reason.trim(), note?.trim() ?? null);
    return reply.status(201).send({ id: newId });
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

    const newId = db.terminationReasons.insert(
      sqlite,
      Number(id),
      reason.trim(),
      note?.trim() ?? null
    );
    return reply.status(201).send({ id: newId });
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
    const numericId = Number(id);

    const role = db.roles.getById(sqlite, numericId);
    if (!role) {
      return reply.status(404).send({ error: `No role found with ID ${id}` });
    }

    const jd = db.jobDescriptions.getByRoleId(sqlite, numericId);
    const roleWithJd: RoleRow = { ...role, jd: jd?.content ?? '' };

    const validFormats: ExportFormat[] = ['simple', 'rich'];
    const fmt = (validFormats.includes(format as ExportFormat) ? format : 'simple') as ExportFormat;

    return { content: exportRole(roleWithJd, fmt), format: fmt };
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
