# career-assistant

## Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Milestones](#milestones)
4. [Roadmap](#roadmap)
5. [Architecture](#architecture)

---

## Overview

career-assistant is a local-first platform for job market intelligence and career opportunity analysis, built on SQLite with a Fastify REST API and Vue 3 frontend.

The system is organized around four modules:

**Job role data** — the core data layer. Roles are imported in bulk from a plain-text format or added individually via JSON. Each role carries a job description, candidacy assessment, salary range, and vocabulary-constrained classification labels designed for downstream analysis.

**Job market intelligence** *(planned)* — bulk ingestion of job postings at scale, LLM-based classification by role subtype and skill requirements, and market analysis via cloud and local LLMs. Answers questions about market trends, compensation ranges, emerging skill demand, and career trajectory. The role data layer provides ground-truth signal from real market data.

**Career opportunity identification and mapping** *(planned)* — skills gap analysis against a personal profile, career path recommendations driven by market data, and guidance on high-value areas of investment given current market conditions.

**Testing modules** — a layered test suite covering unit tests for all pure functions, integration tests for CLI scripts, and Playwright E2E tests for the UI (planned). Built to support Extreme Programming practices — changes can be made confidently with Claude or independently.

Role lifecycle tracking — statuses, skip reasons, and termination reasons — is supported as a lightweight mechanism for feeding real-world outcome data back into the market analysis layer.

This project also serves as a deliberate experiment in LLM-assisted software development: every architectural decision, naming convention, and refactoring choice was made through reasoned collaboration with Claude, producing a codebase that reflects genuine engineering judgment. Multi-level test automation — unit, integration, and E2E — was implemented both as an experiment in test coverage strategy and to establish fixed correctness parameters within which LLM-assisted coding can operate safely at scale.

---

## Setup

### Prerequisites

- Node.js 24 (`.nvmrc` included — run `nvm use`)
- npm

### Install

```bash
nvm use
npm install
cd client && npm install && cd ..
```

### Initialise the database

```bash
npm run init
```

Creates `db/career-assistant.sqlite`.

### Run

```bash
# Terminal 1 — API server (port 3000)
npx ts-node server/index.ts

# Terminal 2 — Vue client (port 5173)
cd client && npm run dev
```

Open `http://localhost:5173`.

### Tests

```bash
npm test
```

---

## Milestones

| Milestone | Status |
|---|---|
| SQLite schema, seed import, CLI data layer | Done |
| TypeScript migration, Vitest test suite | Done |
| Full CLI tooling (import, export, update, delete) | Done |
| Layered validation architecture | Done |
| Unit and integration test suite | Done |
| Vue 3 frontend + Fastify REST API | Done |
| Frontend stabilization and bug fixes (CAR-2) | Done |
| Rename e2e → integration tests (CAR-14) | Done |
| Node.js upgrade to v24 (CAR-31) | Done |
| Git history scrub, .gitignore audit (CAR-27 partial) | Done |

---

## Roadmap

Items in rough priority order. Backlog items are lower priority.

**Public repository preparation (CAR-27)**
README, pre-publication audit (CAR-29). CAR-28 in progress.

**Test infrastructure (CAR-3)**
Playwright E2E suite (CAR-15), test database isolation (CAR-16).

**ESLint (CAR-37)**
Enforce codebase style conventions including `stroustrup` brace style (CAR-51).

**Data layer refactor (CAR-5)**
Extract single-table `db/` modules (CAR-20), refactor `lib/` orchestration (CAR-21), fill one-to-many test coverage gaps (CAR-22). Extend status transition modal to support per-reason notes once data layer supports it (CAR-50).

**GitHub merge gate (CAR-56)**
Unit test gate (CAR-57), then integration (CAR-58, blocked by CAR-16) and Playwright (CAR-59, blocked by CAR-15). Node 24 update (CAR-60, blocked by CAR-57).

**npm workspace restructuring + ES module migration (CAR-4)** *(Backlog)*
Restructure into `@career-assistant/data`, `@career-assistant/server`, `@career-assistant/client` (CAR-17). Update import paths (CAR-18). Migrate to ES modules (CAR-19).

**SkillsGapTracker migration (CAR-6)** *(Backlog)*
Schema design (CAR-23), data layer and scripts (CAR-24), frontend integration (CAR-25).

**Claude workflow migration (CAR-7)**
Replace triage and career development Claude project workflows with direct API calls.

**LLM-powered job market analysis (CAR-32)** *(Backlog)*
Bulk ingestion pipeline (CAR-33), role classification and skill extraction (CAR-34), cloud and local LLM integration (CAR-35), market analysis dashboard (CAR-36).

**Known bugs (Backlog)**
Role can simultaneously have skip and termination reasons (CAR-53).

**Ideas under consideration (Backlog)**
Runtime schema validation — Zod / TypeBox / Valibot (CAR-44). Contract testing — Pact / OpenAPI (CAR-45). Prettier for automated formatting (CAR-52).

---

## Architecture

### Repository structure

```
career-assistant/
├── .nvmrc                   # Node.js version (24)
├── db/                      # Schema and initialization
│   ├── schema.ts            # Single source of truth for SQLite schema
│   └── init.ts              # One-time DB initialization
├── lib/                     # Business logic — no I/O
│   ├── types.ts             # Shared types + runtime vocabulary arrays
│   ├── roles.ts             # Role insertion with validation
│   ├── updates.ts           # Status update validation + orchestration
│   ├── deletes.ts           # Delete operations with FK awareness
│   ├── parse-records.ts     # Plain-text import format parser
│   ├── exporters/           # Role export (simple + rich formats)
│   └── args/                # CLI argument parsers
├── scripts/                 # CLI entry points — thin I/O wrappers over lib/
├── server/                  # Fastify REST API
│   └── routes/              # roles, query, backup
├── client/                  # Vue 3 frontend
│   ├── tsconfig.json        # Browser-targeted TypeScript config
│   └── src/
│       ├── views/           # RoleList, RoleDetail, AddRole, SqlQuery
│       ├── composables/     # useApi fetch wrapper
│       └── constants.ts     # Frontend vocabulary constants
└── tests/
    ├── helpers/             # createTestDb(), runScript()
    ├── unit/                # Pure function tests
    └── integration/         # CLI script tests (black box)
```

### Key design decisions

**lib/ and scripts/ separation** — all business logic lives in `lib/` with no I/O. Scripts, server routes, and tests are all callers of the same `lib/` functions. Chosen for: independent testability, shared logic across CLI, HTTP, and test contexts.

**Validation in layers** — syntactic validation in argument parsers, semantic validation in `lib/`, DB-layer enforcement via CHECK constraints and FK constraints. Each layer catches different failure modes.

**Runtime vocabulary arrays alongside union types** — TypeScript union types (`RoleStatus`, `SkipReasonType`, etc.) enforce vocabulary at compile time. Parallel runtime arrays (`VALID_STATUSES`, etc.) enable validation of external input at the network boundary. Both defined in `lib/types.ts`, typed so the compiler keeps them in sync.

**SQLite with FK enforcement** — `PRAGMA foreign_keys = ON` in schema. Delete operations use preview/normal/force modes. UNIQUE constraint on `job_descriptions.role_id` enforces one-to-one relationship.

**In-memory test databases** — unit tests use `better-sqlite3`'s `:memory:` mode via `createTestDb()`. Each test gets a fresh isolated instance via `beforeEach`/`afterEach`. Real SQL, real constraints, no cleanup.

**Server/client split** — Fastify on port 3000, Vite on port 5173 proxying `/api` in development. Chosen to keep the backend deployment-ready for future cloud architecture without structural changes.

### Technology choices

| Concern | Choice | Rationale |
|---|---|---|
| Database | SQLite + better-sqlite3 | Local-first, zero infrastructure, synchronous API |
| Language | TypeScript 6 (strict) | Type safety for domain vocabulary, compile-time correctness |
| Test framework | Vitest | Native TypeScript, Vite-native, Jest-compatible API |
| HTTP server | Fastify | TypeScript-native, performant, plugin architecture |
| Frontend | Vue 3 (Composition API) | Vite-native, same author as Vite, clean TS integration |
| CSS | Tailwind CSS v4 | Utility-first, `@theme`-based custom tokens |
| Runtime | Node.js 24 | LTS, compatible with better-sqlite3 v12+ |
