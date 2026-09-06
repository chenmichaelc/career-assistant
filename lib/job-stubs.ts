// lib/job-stubs.ts

import Database from 'better-sqlite3';
import { db } from './db';
import { cleanseUrl } from './url-cleanse';

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
