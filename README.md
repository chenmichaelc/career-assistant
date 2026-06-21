# career-assistant

_Licensed under the [GNU General Public License v3.0](LICENSE)._

| Pipeline Description     | Status                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Most Recent Pull Request | [![pull-request](https://github.com/chenmichaelc/career-assistant/actions/workflows/pull-request.yml/badge.svg)](https://github.com/chenmichaelc/career-assistant/actions/workflows/pull-request.yml) |
| Most Recent Push         | [![Most Recent Push](https://github.com/chenmichaelc/career-assistant/actions/workflows/push.yml/badge.svg)](https://github.com/chenmichaelc/career-assistant/actions/workflows/push.yml)             |

## Contents

1. [About this project](#about-this-project)
2. [Overview](#overview)
3. [Currently working on](#currently-working-on)
4. [Setup](#setup)
5. [Milestones](#milestones)
6. [Roadmap](#roadmap)
7. [Architecture](#architecture)

---

## Overview

career-assistant is a local-first platform for job market intelligence and career opportunity analysis, built on SQLite with a Fastify REST API and Vue 3 frontend.

The system is organized around four modules:

**Job role data** — the core data layer. Roles are imported in bulk from a plain-text format or added individually via JSON. Each role carries a job description, candidacy assessment, salary range, and vocabulary-constrained classification labels designed for downstream analysis.

**Job market intelligence** _(planned)_ — bulk ingestion of job postings at scale, LLM-based classification by role subtype and skill requirements, and market analysis via cloud and local LLMs. Answers questions about market trends, compensation ranges, emerging skill demand, and career trajectory. The role data layer provides ground-truth signal from real market data.

**Career opportunity identification and mapping** _(planned)_ — skills gap analysis against a personal profile, career path recommendations driven by market data, and guidance on high-value areas of investment given current market conditions.

**Testing modules** — a layered test suite covering unit tests for pure functions, integration tests for CLI scripts, and Playwright E2E tests for the UI. Built to support Extreme Programming practices — changes can be made confidently with Claude or manually, with a safety net designed to catch regressions immediately.

Role lifecycle tracking — statuses, skip reasons, and termination reasons — is supported as a lightweight mechanism for feeding real-world outcome data back into the market analysis layer.

---

## About this project

career-assistant is built to serve three interrelated purposes:

- A demonstration of engineering and testing methodologies as applied to a web application, intended to maximize stability, scalability, and traceability
- A platform on which to test emerging tools in the realms of testing and sustainable AI-generated coding practices
- A product which can provide ongoing analytics and guidance on the job market and long term career planning

The feature set is intentionally modest relative to the engineering investment. The primary subject of evaluation here is the **methodology**, not the application:

- A three-layer test pyramid (unit, integration, E2E) with real constraint enforcement rather than mocks
- A layered validation architecture (syntactic, semantic, persistence) that catches different failure modes at each layer
- A CI/CD pipeline with quality gates — linting, formatting, and automated test enforcement — that runs on every push, every pull request, and every local commit
- Documentation maintained as a living record of _why_ decisions were made, including decisions that were later reversed, and why

---

## Currently working on

**[CAR-21] Refactor `lib/` to orchestrate from `db/` modules**

Refactoring the data layer so that all business logic in `lib/` composes from the single-table modules in `lib/db/` instead of executing SQL directly. This is the prerequisite for replacing the existing CLI-based integration tests with proper HTTP-level integration tests using Fastify's `inject()` method — a necessary step toward a more robust and realistic test suite that covers the actual integration paths the application uses (Vue → Fastify routes → `lib/` → SQLite), rather than a CLI layer that no longer reflects how the application is used in practice.

**Subtasks:**

- CAR-162 — Refactor `lib/deletes.ts` to compose from `lib/db/` modules
- CAR-163 — Refactor `lib/roles.ts` to compose from `lib/db/` modules
- CAR-164 — Refactor `server/routes/roles.ts` to remove raw SQL and eliminate N+1 query pattern
- CAR-165 — Remove CLI scripts layer (except `init-db.ts`)
- CAR-166 — Remove CLI-based integration tests and `run-script.ts` helper
- CAR-167 — Write Fastify `inject()` integration tests for HTTP routes
- CAR-168 — Audit codebase to confirm elimination of SQL outside `lib/db/`

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
cd e2e && npm install && cd ..
```

### Initialise the database

```bash
npm run init
```

Creates `db/career-assistant.sqlite`.

### Run

```bash
# Terminal 1 — API server (port 3000)
npm run server

# Terminal 2 — Vue client (port 5173)
npm run client
```

Open `http://localhost:5173`.

### Tests

```bash
npm test              # Vitest, watch mode — unit + integration
npm run test:run      # Vitest, single pass, non-interactive
npm run test:e2e      # Playwright E2E
```

### Linting and formatting

```bash
npm run lint          # ESLint — code quality rules
npm run format        # Prettier — code formatting, whole codebase
```

Formatting and a full non-interactive test run are also enforced automatically on every commit via a Husky pre-commit hook: staged files are formatted via `lint-staged` + Prettier, then `npm run test:run` runs the full unit and integration suite before the commit is allowed to complete.

---

## Milestones

| Milestone                                                             | Status |
| --------------------------------------------------------------------- | ------ |
| SQLite schema, seed import, CLI data layer                            | Done   |
| TypeScript migration, Vitest test suite                               | Done   |
| Full CLI tooling (import, export, update, delete)                     | Done   |
| Layered validation architecture                                       | Done   |
| Unit and integration test suite                                       | Done   |
| Vue 3 frontend + Fastify REST API                                     | Done   |
| Frontend stabilization and bug fixes (CAR-2)                          | Done   |
| Rename e2e → integration tests (CAR-14)                               | Done   |
| Node.js upgrade to v24 (CAR-31)                                       | Done   |
| Playwright E2E setup — structure, smoke test, POM foundation (CAR-15) | Done   |
| GitHub merge gate (CAR-56)                                            | Done   |
| ESLint implementation across full codebase (CAR-37)                   | Done   |
| Single-table data layer modules — `lib/db/` (CAR-20)                  | Done   |
| Prettier formatting + automatic pre-commit enforcement (CAR-52)       | Done   |
| CI/CD quality gates — lint as a merge gate (CAR-145)                  | Done   |

---

## Roadmap

Items in rough priority order. Backlog items are lower priority.

**Test infrastructure (CAR-3)**
Test database isolation via DB_PATH environment variable (CAR-16) to enable clean CI runs against an in-memory database. Splitting `test` into separate unit and integration scripts was considered during CAR-52's pre-commit setup, in anticipation of a future database migration (CAR-5) and a possible supplemental NoSQL store for job profile analysis (CAR-32) — deferred for now, since the current combined suite runs in seconds and the split would add maintenance surface without present benefit. Revisit when either migration becomes concrete.

**Data layer refactor (CAR-5)** _(In Progress)_
Single-table `lib/db/` modules are complete (CAR-20). Remaining: refactor `lib/` orchestration to compose from these modules instead of executing SQL directly (CAR-21), fill one-to-many test coverage gaps (CAR-22).

**Observability — error logging and persistence (CAR-139)**
Audit existing error handling across the codebase first (CAR-141), then implement consistent logging on the client (CAR-140) and server (CAR-72). Persist server logs to disk via Pino file transport (CAR-142). A full-stack persistent error store, spanning both client and server, is deferred until cloud migration planning begins (CAR-143).

**Contextual status tracking (CAR-116)**
Decompose the overloaded `role_status` field into separate triage status, application history status, and analysis status fields (CAR-118, CAR-119, CAR-120). Update filters and UI accordingly (CAR-117).

**Playwright full workflow coverage (CAR-63)** _(blocked by CAR-15, CAR-16)_
Roles list (CAR-64), role detail (CAR-65), add role (CAR-66), SQL query (CAR-67), backup (CAR-68).

**Playwright test data management (CAR-91)**
Fixture-based role creation and cleanup via semantic company name identification.

**Refactor RoleDetail.vue (CAR-99)** _(Backlog)_
Extract DeleteModal, ExportModal, ReasonModal, and AddReasonControl into dedicated components.

**npm workspace restructuring + ES module migration (CAR-4)** _(Backlog)_
Restructure into `@career-assistant/data`, `@career-assistant/server`, `@career-assistant/client` (CAR-17). Update import paths (CAR-18). Migrate to ES modules (CAR-19). Resolves the current vocabulary type duplication between `lib/types.ts` and `client/src/constants.ts`, and unblocks several `any`-suppression cleanups tracked in CAR-147.

**SkillsGapTracker migration (CAR-6)** _(Backlog)_
Schema design (CAR-23), data layer and scripts (CAR-24), frontend integration (CAR-25).

**Claude workflow migration (CAR-7)**
Replace triage and career development Claude project workflows with direct API calls.

**LLM-powered job market analysis (CAR-32)** _(Backlog)_
Bulk ingestion pipeline (CAR-33), role classification and skill extraction (CAR-34), cloud and local LLM integration (CAR-35), market analysis dashboard (CAR-36).

**Server route test suite (CAR-73)** _(Backlog)_
Tests for Fastify routes using `inject()`.

**Analytics foundation (CAR-70)** _(Backlog)_
Pre-built aggregate queries and analytics view.

**Known bugs (Backlog)**
Role can simultaneously have skip and termination reasons (CAR-53). `request.body as any` on POST /api/roles, suppressed pending CAR-44 (CAR-61, CAR-148). `ref<any>` in Vue components, suppressed pending CAR-4 (CAR-62, CAR-147). POST reason endpoints pass role ID as string (CAR-103). Backup route blocks event loop with sync fs calls (CAR-104). N+1 query pattern in `GET /api/roles` (CAR-136). Backup failure toast renders in success colours (CAR-138).

**Ideas under consideration (Backlog)**
Runtime schema validation — Zod / TypeBox / Valibot (CAR-44). Contract testing — Pact / OpenAPI (CAR-45). Deprecate raw SQL query endpoint before non-local deployment (CAR-71). Persistent error store spanning client and server, ahead of cloud migration (CAR-143). Automated job post scraping (CAR-93). Resume storage and analysis (CAR-94). Custom resume builder (CAR-95).

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for in-depth documentation of design decisions and rationale, including the full history of decisions made and later revised.

### Repository structure

```
career-assistant/
├── .nvmrc                   # Node.js version (24)
├── .prettierrc.json         # Prettier formatting configuration
├── .prettierignore          # Paths excluded from Prettier
├── .husky/
│   └── pre-commit           # lint-staged (Prettier on staged files), then npm run test:run
├── .github/
│   └── workflows/
│       ├── push.yml         # CI — runs on every push, includes lint gate
│       └── pull-request.yml # CI — runs on every pull request, includes lint gate
├── eslint.config.mts        # ESLint flat config — root-level, governs all layers, defers to Prettier
├── vitest.config.ts         # Vitest config — excludes Playwright specs from unit/integration runs
├── db/                      # Schema and initialization
│   ├── schema.ts            # Single source of truth for SQLite schema (definitions only)
│   └── setup.ts             # Exports applySchema() for server and test use
├── lib/                     # Business logic — no I/O
│   ├── types.ts             # Shared types + runtime vocabulary arrays
│   ├── roles.ts             # Role insertion with validation
│   ├── updates.ts           # Status update validation + orchestration
│   ├── deletes.ts           # Delete operations with FK awareness
│   ├── parse-records.ts     # Plain-text import format parser
│   ├── db/                  # Single-table CRUD modules (CAR-20)
│   ├── exporters/           # Role export (simple + rich formats)
│   └── args/                # CLI argument parsers
├── scripts/                 # CLI entry points — thin I/O wrappers over lib/
├── server/                  # Fastify REST API
│   ├── package.json         # Server-scoped dependencies (early workspace structure)
│   └── routes/              # roles, query, backup
├── client/                  # Vue 3 frontend
│   ├── tsconfig.json        # Thin reference file — points to tsconfig.app.json and tsconfig.node.json
│   ├── tsconfig.app.json    # Browser-targeted TypeScript config for src/
│   ├── tsconfig.node.json   # Node-targeted TypeScript config for vite.config.ts
│   └── src/
│       ├── views/           # RoleList, RoleDetail, AddRole, SqlQuery
│       ├── composables/     # useApi fetch wrapper
│       └── constants.ts     # Frontend vocabulary constants
├── e2e/                     # Playwright E2E tests
│   ├── package.json         # E2E-scoped dependencies
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   ├── pages/               # Page Object Model classes
│   └── tests/               # Playwright specs
└── tests/
    ├── helpers/             # createTestDb(), runScript()
    ├── unit/                # Pure function tests
    │   └── lib/db/          # Tests for single-table lib/db/ modules
    └── integration/         # CLI script tests (black box)
```

### Key design decisions

**lib/ and scripts/ separation** — all business logic lives in `lib/` with no I/O. Scripts, server routes, and tests are all callers of the same `lib/` functions. Chosen for: independent testability, shared logic across CLI, HTTP, and test contexts.

**Validation in layers** — syntactic validation in argument parsers, semantic validation in `lib/`, DB-layer enforcement via CHECK constraints and FK constraints. Each layer catches different failure modes.

**Runtime vocabulary arrays alongside union types** — TypeScript union types (`RoleStatus`, `SkipReasonType`, etc.) enforce vocabulary at compile time. Parallel runtime arrays (`VALID_STATUSES`, etc.) enable validation of external input at the network boundary. Both defined in `lib/types.ts`, typed so the compiler keeps them in sync.

**SQLite with FK enforcement** — `PRAGMA foreign_keys = ON` in schema. Delete operations use preview/normal/force modes. UNIQUE constraint on `job_descriptions.role_id` enforces one-to-one relationship.

**In-memory test databases** — unit tests use `better-sqlite3`'s `:memory:` mode via `createTestDb()`. Each test gets a fresh isolated instance via `beforeEach`/`afterEach`. Real SQL, real constraints, no cleanup.

**Server/client split** — Fastify on port 3000, Vite on port 5173 proxying `/api` in development. Chosen to keep the backend deployment-ready for future cloud architecture without structural changes.

**Co-located configuration, with one deliberate exception** — each module owns its TypeScript and tool configuration: `client/tsconfig.app.json` / `tsconfig.node.json` for the Vue frontend, `e2e/playwright.config.ts` and `e2e/tsconfig.json` for Playwright. Root `tsconfig.json` covers the Node.js data layer. ESLint is the deliberate exception — `eslint.config.mts` lives at the repository root because it needs to govern all layers simultaneously in a single pass, rather than being scoped to one module. See ARCHITECTURE.md for the full rationale.

**Formatting owned entirely by Prettier** — ESLint enforces code quality rules; Prettier owns all visual formatting, including brace placement. `eslint-config-prettier` is included as the final entry in `eslint.config.mts`, disabling any ESLint rule that would otherwise conflict with Prettier's output. This was a deliberate late decision — see ARCHITECTURE.md's "Code quality and formatting" section for the full history of why a brace-style rule was added via ESLint, then removed in favor of full Prettier ownership.

**Quality gates enforced locally, not just in CI** — a Husky pre-commit hook runs Prettier (via lint-staged, scoped to staged files only) and the full unit/integration suite (via `npm run test:run`, since the full suite runs in seconds and scoping it to changed files only is unreliable — see ARCHITECTURE.md for why). This catches formatting and regression issues before they're committed, not just before they're merged.

### Technology choices

| Concern        | Choice                                                  | Rationale                                                                |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Database       | SQLite + better-sqlite3                                 | Local-first, zero infrastructure, synchronous API                        |
| Language       | TypeScript 6 (strict)                                   | Type safety for domain vocabulary, compile-time correctness              |
| Test framework | Vitest                                                  | Native TypeScript, Vite-native, Jest-compatible API                      |
| E2E framework  | Playwright                                              | Cross-browser, POM support, first-class TypeScript                       |
| HTTP server    | Fastify                                                 | TypeScript-native, performant, plugin architecture                       |
| Frontend       | Vue 3 (Composition API)                                 | Vite-native, same author as Vite, clean TS integration                   |
| CSS            | Tailwind CSS v4                                         | Utility-first, `@theme`-based custom tokens                              |
| Linting        | ESLint (flat config)                                    | TypeScript-aware, Vue-aware, Playwright-aware rule sets in one pass      |
| Formatting     | Prettier + eslint-config-prettier + Husky + lint-staged | Automatic, zero-decision formatting and test enforcement on every commit |
| Runtime        | Node.js 24                                              | LTS, compatible with better-sqlite3 v12+                                 |
| License        | GPL v3                                                  | Copyleft — derivative works must remain open source                      |
