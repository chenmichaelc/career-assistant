// lib/admin.ts
// Career Assistant — Admin orchestration
// Auxiliary operations supporting test data management and administrative tasks.

import Database from 'better-sqlite3';
import { db } from './db';
import { deleteRole } from './deletes';

export interface CleanupResult {
  deleted: number[];
  count: number;
}

export function cleanupTestRoles(sqlite: Database.Database, companies: string[]): CleanupResult {
  const roles = db.roles.getIdsByCompanies(sqlite, companies);

  const deleted: number[] = [];

  for (const role of roles) {
    deleteRole(sqlite, role.id, true);
    deleted.push(role.id);
  }

  return { deleted, count: deleted.length };
}

export function cleanupTestStubs(sqlite: Database.Database, urlPrefix: string): CleanupResult {
  const stubs = db.jobStubs.getAllByUrlPrefix(sqlite, urlPrefix);

  const deleted: number[] = [];

  for (const stub of stubs) {
    db.jobStubs.deleteById(sqlite, stub.id);
    deleted.push(stub.id);
  }

  return { deleted, count: deleted.length };
}
