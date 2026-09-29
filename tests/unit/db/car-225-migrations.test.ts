// tests/unit/db/car-225-migrations.test.ts
// Temporary — delete alongside db/car-225-migrations.ts per CAR-289.
import { describe, test, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { applyColumnMigrations, COLUMN_MIGRATIONS } from '../../../db/car-225-migrations';
import { applySchema } from '../../../db/setup';
import { db } from '../../../lib/db';

let sqlite: Database.Database;

afterEach(() => {
  sqlite?.close();
});

describe('applyColumnMigrations against a fresh (already-current) database', () => {
  test.each(COLUMN_MIGRATIONS)(
    '$table.$column already exists, so migrating is a no-op',
    (migration) => {
      sqlite = new Database(':memory:');
      applySchema(sqlite);
      applyColumnMigrations(sqlite);

      const columns = sqlite.prepare(`PRAGMA table_info(${migration.table})`).all() as {
        name: string;
      }[];
      expect(columns.some((column) => column.name === migration.column)).toBe(true);
    }
  );
});

describe('applyColumnMigrations against a pre-CAR-285 roles table', () => {
  function createLegacyRolesDb(): Database.Database {
    const legacy = new Database(':memory:');
    legacy.exec(`
      CREATE TABLE roles (
        id            INTEGER PRIMARY KEY,
        company       TEXT NOT NULL,
        title         TEXT NOT NULL,
        url           TEXT,
        role_status   TEXT NOT NULL,
        candidacy     TEXT,
        applied_date  TEXT,
        salary_min    INTEGER,
        salary_max    INTEGER,
        notes         TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    return legacy;
  }

  test('adds the missing location and in_office_expectation columns without touching existing rows', () => {
    sqlite = createLegacyRolesDb();
    sqlite
      .prepare(`INSERT INTO roles (company, title, url, role_status) VALUES (?, ?, ?, ?)`)
      .run('Acme', 'Eng', 'https://example.com/job/1', 'Pending Triage');

    applyColumnMigrations(sqlite);

    const role = db.roles.getAll(sqlite)[0];
    expect(role.company).toBe('Acme');
    expect(role.location).toBeNull();
    expect(role.in_office_expectation).toBeNull();
  });

  test('is idempotent — running it twice is safe', () => {
    sqlite = createLegacyRolesDb();
    applyColumnMigrations(sqlite);
    applyColumnMigrations(sqlite);

    const id = db.roles.insertRole(sqlite, {
      company: 'Acme',
      title: 'Eng',
      url: 'https://example.com/job/1',
      role_status: 'Pending Triage',
      location: 'Remote',
      in_office_expectation: 'Remote',
    });
    const role = db.roles.getById(sqlite, id);
    expect(role?.location).toBe('Remote');
    expect(role?.in_office_expectation).toBe('Remote');
  });

  test('rejects an invalid in_office_expectation value — CHECK constraint carries over', () => {
    sqlite = createLegacyRolesDb();
    applyColumnMigrations(sqlite);

    expect(() =>
      db.roles.insertRole(sqlite, {
        company: 'Acme',
        title: 'Eng',
        url: 'https://example.com/job/1',
        role_status: 'Pending Triage',
        in_office_expectation: 'Not A Real Value',
      })
    ).toThrow('CHECK constraint failed');
  });

  test('migrates roles even when job_stubs does not exist at all — matches the real prod shape', () => {
    sqlite = createLegacyRolesDb();
    // No job_stubs table at all — this is the actual shape of the real
    // production database today (CAR-224 never shipped there).

    expect(() => applyColumnMigrations(sqlite)).not.toThrow();

    const columns = sqlite.prepare(`PRAGMA table_info(roles)`).all() as { name: string }[];
    expect(columns.some((column) => column.name === 'location')).toBe(true);
    expect(columns.some((column) => column.name === 'in_office_expectation')).toBe(true);
  });
});

describe('applyColumnMigrations against a pre-CAR-285 job_stubs table', () => {
  function createLegacyJobStubsDb(): Database.Database {
    const legacy = new Database(':memory:');
    legacy.exec(`
      CREATE TABLE job_stubs (
        id                          INTEGER PRIMARY KEY,
        url                         TEXT NOT NULL UNIQUE,
        status                      TEXT NOT NULL DEFAULT 'Stubbed',
        raw_content                 TEXT,
        parsed_company              TEXT,
        parsed_title                TEXT,
        parsed_description          TEXT,
        parsed_salary_min           INTEGER,
        parsed_salary_max           INTEGER,
        parsed_candidacy            TEXT,
        parsed_role_status          TEXT,
        parsed_skip_reasons         TEXT,
        parsed_termination_reasons  TEXT,
        created_at                  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    return legacy;
  }

  test('adds the missing parsed_location and parsed_in_office_expectation columns without touching existing rows', () => {
    sqlite = createLegacyJobStubsDb();
    sqlite.prepare(`INSERT INTO job_stubs (url) VALUES (?)`).run('https://example.com/jobs/1');

    applyColumnMigrations(sqlite);

    const stub = db.jobStubs.getAll(sqlite)[0];
    expect(stub.url).toBe('https://example.com/jobs/1');
    expect(stub.parsed_location).toBeNull();
    expect(stub.parsed_in_office_expectation).toBeNull();
  });
});
