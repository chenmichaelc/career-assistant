// lib/job-stubs.ts

import Database from 'better-sqlite3';
import { z } from 'zod';
import { db, ParsedFieldsUpdate } from './db';
import { cleanseUrl } from './url-cleanse';
import {
  JobStubRow,
  VALID_CANDIDACIES,
  VALID_STATUSES,
  VALID_SKIP_REASONS,
  VALID_TERMINATION_REASONS,
  VALID_IN_OFFICE_EXPECTATIONS,
  VALID_JOB_STUB_STATUSES,
  isJobStubStatus,
} from './types';

export class DuplicateStubUrlError extends Error {
  constructor(url: string) {
    super(`A stub for this URL already exists: ${url}`);
    this.name = 'DuplicateStubUrlError';
  }
}

export class DuplicateRoleUrlError extends Error {
  constructor(url: string) {
    super(`A role already exists for this URL: ${url}`);
    this.name = 'DuplicateRoleUrlError';
  }
}

export class JobStubNotFoundError extends Error {
  constructor(stubId: number) {
    super(`No job stub found with id ${stubId}.`);
    this.name = 'JobStubNotFoundError';
  }
}

export class InvalidParsedFieldsError extends Error {
  public readonly issues: string[];

  constructor(issues: string[]) {
    super(`Validation failed:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'InvalidParsedFieldsError';
    this.issues = issues;
  }
}

// ─── addStub ──────────────────────────────────────────────────────────────────

export function addStub(sqlite: Database.Database, rawUrl: string): number {
  const url = cleanseUrl(rawUrl);

  const existingStub = db.jobStubs.getByUrl(sqlite, url);
  if (existingStub != null) {
    throw new DuplicateStubUrlError(url);
  }

  const existingRole = db.roles.existsByUrl(sqlite, url);
  if (existingRole) {
    throw new DuplicateRoleUrlError(url);
  }

  return db.jobStubs.insertStub(sqlite, url);
}

// ─── importParsedFields ─────────────────────────────────────────────────────

function reasonEntrySchema<const T extends readonly string[]>(validValues: T) {
  return z.object({
    reason: z.enum(validValues),
    note: z.string().nullable().optional(),
  });
}

export const ParsedJobStubFieldsSchema = z.object({
  company: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  salary_min: z.number().int().nonnegative().nullable().optional(),
  salary_max: z.number().int().nonnegative().nullable().optional(),
  candidacy: z.enum(VALID_CANDIDACIES).nullable().optional(),
  role_status: z.enum(VALID_STATUSES).nullable().optional(),
  skip_reasons: z.array(reasonEntrySchema(VALID_SKIP_REASONS)).nullable().optional(),
  termination_reasons: z.array(reasonEntrySchema(VALID_TERMINATION_REASONS)).nullable().optional(),
  location: z.string().nullable().optional(),
  in_office_expectation: z.enum(VALID_IN_OFFICE_EXPECTATIONS).nullable().optional(),
});

export type ParsedJobStubFields = z.infer<typeof ParsedJobStubFieldsSchema>;

function requireStub(sqlite: Database.Database, stubId: number): void {
  if (db.jobStubs.getById(sqlite, stubId) == null) {
    throw new JobStubNotFoundError(stubId);
  }
}

function validateParsedFields(rawJson: unknown): ParsedJobStubFields {
  const result = ParsedJobStubFieldsSchema.safeParse(rawJson);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`
    );
    throw new InvalidParsedFieldsError(issues);
  }
  return result.data;
}

function toParsedFieldsUpdate(fields: ParsedJobStubFields): ParsedFieldsUpdate {
  return {
    parsed_company: fields.company ?? null,
    parsed_title: fields.title ?? null,
    parsed_description: fields.description ?? null,
    parsed_salary_min: fields.salary_min ?? null,
    parsed_salary_max: fields.salary_max ?? null,
    parsed_candidacy: fields.candidacy ?? null,
    parsed_role_status: fields.role_status ?? null,
    parsed_skip_reasons: fields.skip_reasons ? JSON.stringify(fields.skip_reasons) : null,
    parsed_termination_reasons: fields.termination_reasons
      ? JSON.stringify(fields.termination_reasons)
      : null,
    parsed_location: fields.location ?? null,
    parsed_in_office_expectation: fields.in_office_expectation ?? null,
  };
}

const JSON_FIELD_TO_COLUMN: Record<string, keyof ParsedFieldsUpdate> = {
  company: 'parsed_company',
  title: 'parsed_title',
  description: 'parsed_description',
  salary_min: 'parsed_salary_min',
  salary_max: 'parsed_salary_max',
  candidacy: 'parsed_candidacy',
  role_status: 'parsed_role_status',
  skip_reasons: 'parsed_skip_reasons',
  termination_reasons: 'parsed_termination_reasons',
  location: 'parsed_location',
  in_office_expectation: 'parsed_in_office_expectation',
};

export function importParsedFields(
  sqlite: Database.Database,
  stubId: number,
  rawJson: unknown
): JobStubRow {
  requireStub(sqlite, stubId);
  const fields = validateParsedFields(rawJson);

  const run = sqlite.transaction(() => {
    db.jobStubs.setParsedFields(sqlite, stubId, toParsedFieldsUpdate(fields));
    db.jobStubs.updateStatus(sqlite, stubId, 'Parsed');
  });
  run();

  return db.jobStubs.getById(sqlite, stubId)!;
}

export function patchParsedFields(
  sqlite: Database.Database,
  stubId: number,
  rawJson: unknown
): JobStubRow {
  requireStub(sqlite, stubId);
  const fields = validateParsedFields(rawJson);

  if (typeof rawJson !== 'object' || rawJson === null) {
    throw new InvalidParsedFieldsError(['(root): must be a JSON object.']);
  }
  const providedKeys = rawJson as Record<string, unknown>;

  const fullUpdate = toParsedFieldsUpdate(fields);
  const update: ParsedFieldsUpdate = {};
  for (const [jsonField, column] of Object.entries(JSON_FIELD_TO_COLUMN)) {
    if (jsonField in providedKeys) {
      // Same key on both sides by construction (column comes from
      // fullUpdate's own type) — the dynamic keyof index is what defeats
      // TS's narrowing here, not an actual type mismatch.
      (update as Record<string, unknown>)[column] = fullUpdate[column];
    }
  }

  db.jobStubs.patchParsedFields(sqlite, stubId, update);

  return db.jobStubs.getById(sqlite, stubId)!;
}

export function updateJobStubStatus(
  sqlite: Database.Database,
  stubId: number,
  status: string
): JobStubRow {
  requireStub(sqlite, stubId);

  if (!isJobStubStatus(status)) {
    throw new Error(
      `Invalid status: "${status}". Valid values: ${VALID_JOB_STUB_STATUSES.join(', ')}.`
    );
  }

  db.jobStubs.updateStatus(sqlite, stubId, status);
  return db.jobStubs.getById(sqlite, stubId)!;
}

export function updateRawContent(
  sqlite: Database.Database,
  stubId: number,
  rawContent: string
): JobStubRow {
  requireStub(sqlite, stubId);
  db.jobStubs.setRawContent(sqlite, stubId, rawContent);
  return db.jobStubs.getById(sqlite, stubId)!;
}
