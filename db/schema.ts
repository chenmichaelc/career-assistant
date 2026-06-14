// db/schema.ts
// Career Assistant — Database Schema
// Single source of truth for the SQLite schema.
// Imported by db/setup.ts and tests/helpers/db.ts.

export const schema: string = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS roles (
    id            INTEGER PRIMARY KEY,
    company       TEXT NOT NULL,
    title         TEXT NOT NULL,
    url           TEXT,
    role_status   TEXT NOT NULL CHECK(role_status IN (
                    'Resume Needed',
                    'Resume Ready',
                    'Applied',
                    'Callback',
                    'In Interview',
                    'Offer Accepted',
                    'Offer Declined',
                    'Skipped',
                    'Closed',
                    'On Hold',
                    'Pending Triage'
                  )),
    candidacy     TEXT CHECK(candidacy IN (
                    'Slam Dunk',
                    'Competitive',
                    'Reach',
                    'Skip'
                  )),
    applied_date  TEXT,
    salary_min    INTEGER,
    salary_max    INTEGER,
    notes         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS skip_reasons (
    id        INTEGER PRIMARY KEY,
    role_id   INTEGER NOT NULL REFERENCES roles(id),
    reason    TEXT NOT NULL CHECK(reason IN (
                'Wrong Industry',
                'Culture',
                'Ethics - Exploitative Industry/Product',
                'Ethics - Defense/Military',
                'Ethics - Surveillance',
                'Ethics - Other',
                'Location',
                'Compensation',
                'Skills Gap',
                'Other',
                'Unknown'
              )),
    note      TEXT
  );

  CREATE TABLE IF NOT EXISTS termination_reasons (
    id        INTEGER PRIMARY KEY,
    role_id   INTEGER NOT NULL REFERENCES roles(id),
    reason    TEXT NOT NULL CHECK(reason IN (
                'Screened Out',
                'Filled',
                'Cancelled',
                'Abandoned',
                'Withdrew - Ethics - Exploitative Industry/Product',
                'Withdrew - Ethics - Defense/Military',
                'Withdrew - Ethics - Surveillance',
                'Withdrew - Ethics - Other',
                'Withdrew - Culture',
                'Withdrew - Compensation',
                'Withdrew - Skills Gap',
                'Withdrew - Location',
                'Withdrew - Other'
              )),
    note      TEXT
  );

  CREATE TABLE IF NOT EXISTS job_descriptions (
    id        INTEGER PRIMARY KEY,
    role_id   INTEGER NOT NULL UNIQUE REFERENCES roles(id),
    content   TEXT NOT NULL DEFAULT ''
  );
`;