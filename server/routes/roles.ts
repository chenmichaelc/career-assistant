// server/routes/roles.ts
// Career Assistant — Role API endpoints

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import Database from 'better-sqlite3';
import {
  addRole,
}                           from '../../lib/roles';
import {
  updateRole,
  fetchRoleOrThrow,
}                           from '../../lib/updates';
import {
  deleteRole,
  deleteSkipReason,
  deleteTerminationReason,
  deleteJobDescription,
  previewRoleDeletion,
}                           from '../../lib/deletes';
import { exportRole }       from '../../lib/exporters/index';
import { ExportFormat }     from '../../lib/exporters/index';
import { RoleRow, SkipReasonType, TerminationReasonType } from '../../lib/types';
import { UpdateArgs }       from '../../lib/args/update-args';

interface PluginOptions extends FastifyPluginOptions {
  db: Database.Database;
}

interface SkipReasonRow {
  id:      number;
  role_id: number;
  reason:  SkipReasonType;
  note:    string | null;
}

interface TerminationReasonRow {
  id:      number;
  role_id: number;
  reason:  TerminationReasonType;
  note:    string | null;
}

interface JobDescriptionRow {
  id:      number;
  role_id: number;
  content: string;
}

export async function rolesRouter(fastify: FastifyInstance, options: PluginOptions) {
  const db = options.db;

  // ─── GET /api/roles ─────────────────────────────────────────────────────────

  fastify.get('/', async (request, reply) => {
    const { status, company } = request.query as { status?: string; company?: string };

    let query = `
      SELECT r.id, r.company, r.title, r.url, r.role_status, r.candidacy,
             r.applied_date, r.salary_min, r.salary_max, r.notes,
             r.created_at, r.updated_at
      FROM roles r
      WHERE 1=1
    `;
    const params: string[] = [];

    if (status) {
      query += ` AND r.role_status = ?`;
      params.push(status);
    }

    if (company) {
      query += ` AND r.company LIKE ?`;
      params.push(`%${company}%`);
    }

    query += ` ORDER BY r.applied_date DESC, r.company ASC`;

    const roles = db.prepare(query).all(...params) as RoleRow[];

    const fetchSkipReasons        = db.prepare(`SELECT id, role_id, reason, note FROM skip_reasons WHERE role_id = ? ORDER BY id ASC`);
    const fetchTerminationReasons = db.prepare(`SELECT id, role_id, reason, note FROM termination_reasons WHERE role_id = ? ORDER BY id ASC`);

    const output = roles.map(role => ({
      ...role,
      skip_reasons:        fetchSkipReasons.all(role.id)        as SkipReasonRow[],
      termination_reasons: fetchTerminationReasons.all(role.id) as TerminationReasonRow[],
    }));

    return output;
  });

  // ─── GET /api/roles/:id ──────────────────────────────────────────────────────

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const role = db.prepare(`
      SELECT r.id, r.company, r.title, r.url, r.role_status, r.candidacy,
             r.applied_date, r.salary_min, r.salary_max, r.notes,
             r.created_at, r.updated_at, jd.content AS jd
      FROM roles r
      LEFT JOIN job_descriptions jd ON jd.role_id = r.id
      WHERE r.id = ?
    `).get(id) as (RoleRow & { jd: string }) | undefined;

    if (!role) {
      return reply.status(404).send({ error: `No role found with ID ${id}` });
    }

    const skipReasons        = db.prepare(`SELECT id, role_id, reason, note FROM skip_reasons WHERE role_id = ? ORDER BY id ASC`).all(id)        as SkipReasonRow[];
    const terminationReasons = db.prepare(`SELECT id, role_id, reason, note FROM termination_reasons WHERE role_id = ? ORDER BY id ASC`).all(id) as TerminationReasonRow[];

    return { ...role, skip_reasons: skipReasons, termination_reasons: terminationReasons };
  });

  // ─── POST /api/roles ─────────────────────────────────────────────────────────

  fastify.post('/', async (request, reply) => {
    try {
      const id = addRole(db, request.body as any);
      return reply.status(201).send({ id });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── PATCH /api/roles/:id/status ────────────────────────────────────────────

  fastify.patch('/:id/status', async (request, reply) => {
    const { id }    = request.params as { id: string };
    const body      = request.body as Partial<UpdateArgs>;
    const flags: UpdateArgs = {
      id,
      status:      body.status,
      reasons:     body.reasons     ?? [],
      termination: body.termination ?? [],
      note:        body.note,
    };

    try {
      const role = updateRole(db, flags);
      return { role };
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── DELETE /api/roles/:id ───────────────────────────────────────────────────

  fastify.delete('/:id', async (request, reply) => {
    const { id }    = request.params as { id: string };
    const { force } = request.query  as { force?: string };

    try {
      const result = deleteRole(db, parseInt(id, 10), force === 'true');
      return result;
    } 
    catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  // ─── GET /api/roles/:id/preview-delete ──────────────────────────────────────

  fastify.get('/:id/preview-delete', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return previewRoleDeletion(db, parseInt(id, 10));
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  // ─── GET /api/roles/:id/export ───────────────────────────────────────────────

  fastify.get('/:id/export', async (request, reply) => {
    const { id }     = request.params as { id: string };
    const { format } = request.query  as { format?: string };

    const row = db.prepare(`
      SELECT r.id, r.company, r.title, r.url, r.role_status, r.candidacy,
             r.applied_date, r.salary_min, r.salary_max, r.notes,
             r.created_at, r.updated_at, jd.content AS jd
      FROM roles r
      LEFT JOIN job_descriptions jd ON jd.role_id = r.id
      WHERE r.id = ?
    `).get(id) as (RoleRow & { jd: string }) | undefined;

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
      return deleteSkipReason(db, parseInt(id, 10));
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  // ─── DELETE /api/termination-reasons/:id ─────────────────────────────────────

  fastify.delete('/termination-reasons/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return deleteTerminationReason(db, parseInt(id, 10));
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });

  // ─── DELETE /api/roles/:id/job-description ───────────────────────────────────

  fastify.delete('/:id/job-description', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      return deleteJobDescription(db, parseInt(id, 10));
    } catch (err) {
      return reply.status(404).send({ error: (err as Error).message });
    }
  });
}
