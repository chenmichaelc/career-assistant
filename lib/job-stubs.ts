// lib/job-stubs.ts
// Career Assistant — Job stub operations
// See CAR-224. A stub is a URL-only todo entry; promotion turns it into a
// full role and removes the stub, atomically.

import Database from 'better-sqlite3';
import { RoleInput } from './types';
import { db } from './db';
import { cleanseUrl } from './url-cleanse';
import { addRole } from './roles';

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

export class StubNotFoundError extends Error {
  constructor(id: number) {
    super(`No job stub found with id ${id}.`);
    this.name = 'StubNotFoundError';
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

// ─── promoteStub ────────────────────────────────────────────────────────────────

export function promoteStub(sqlite: Database.Database, stubId: number, role: RoleInput): number {
  const stub = db.jobStubs.getById(sqlite, stubId);
  if (stub == null) {
    throw new StubNotFoundError(stubId);
  }

  let roleId: number;

  const run = sqlite.transaction(() => {
    roleId = addRole(sqlite, role);
    db.jobStubs.deleteById(sqlite, stubId);
  });

  run();
  return roleId!;
}
