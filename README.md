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

**Testing modules** — a layered test suite covering unit tests for pure functions, HTTP-level integration tests, and Playwright E2E tests for the UI. Built to support Extreme Programming practices — changes can be made confidently with Claude or manually, with a safety net designed to catch regressions immediately.

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

**[CAR-5] Data layer refactor — orchestration layer cleanup**

CAR-21 and CAR-173 are complete. The remaining CAR-5 work moves vocabulary validation into the orchestration layer and fills test coverage gaps.

**Open tickets:**

- CAR-178 — Move skip/termination reason vocabulary validation from `server/routes/roles.ts` into the orchestration layer, consistent with how status validation is handled.
- CAR-172 — Resolve `url` field nullability mismatch between `RoleInsertData` (typed `string`) and the schema (`TEXT`, nullable).
- CAR-22 — Fill test coverage gaps for one-to-many relationships (subtasks CAR-174 through CAR-177).
- CAR-50 — Extend status transition to support multiple reasons with per-reason notes. Blocked on CAR-178.

---

**[CAR-63] Playwright E2E — full workflow coverage**

Page objects and smoke tests now cover all four pages (RoleList, RoleDetail, AddRole, SqlQuery). The POM pattern is established: `data-testid` on zone containers, `getByRole`/`getByTestId` within them — no structural or CSS-class-based locators.

Behavioral coverage includes role creation with full field verification, write mode UI behavior on the SQL Query page, and top menu bar navigation across all pages. Remaining gaps: role detail behavioral flows (status update, export, delete modals), SQL query execution, and test data isolation (CAR-16).

---

**[CAR-210] Utilities section — Text Diff Visualizer**

A new "utilities ▾" nav section, client-side only and deliberately stateless (no persistence — see the epic for the explicit scope cut). Nav scaffold and routing (CAR-211) and jsdiff integration (CAR-212) are done. CAR-213 (dual-textarea UI + git-diff-style render) is in progress: the component and its Playwright E2E coverage are in place, but the ticket's own acceptance criteria call for a Vitest component test, gated on `@vue/test-utils`/DOM environment infra that doesn't exist yet (CAR-206, still To Do). Open question, not yet decided: land CAR-206 first, or accept E2E-only coverage for this story and backfill once CAR-206 ships.

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

| Milestone                                                              | Status      |
| ---------------------------------------------------------------------- | ----------- |
| SQLite schema, seed import, CLI data layer                             | Done        |
| TypeScript migration, Vitest test suite                                | Done        |
| Full CLI tooling (import, export, update, delete)                      | Done        |
| Layered validation architecture                                        | Done        |
| Unit and integration test suite                                        | Done        |
| Vue 3 frontend + Fastify REST API                                      | Done        |
| Frontend stabilization and bug fixes (CAR-2)                           | Done        |
| Rename e2e → integration tests (CAR-14)                                | Done        |
| Node.js upgrade to v24 (CAR-31)                                        | Done        |
| Playwright E2E setup — structure, smoke test, POM foundation (CAR-15)  | Done        |
| GitHub merge gate (CAR-56)                                             | Done        |
| ESLint implementation across full codebase (CAR-37)                    | Done        |
| Single-table data layer modules — `lib/db/` (CAR-20)                   | Done        |
| Prettier formatting + automatic pre-commit enforcement (CAR-52)        | Done        |
| CI/CD quality gates — lint as a merge gate (CAR-145)                   | Done        |
| Data layer refactor — lib/ orchestrates from lib/db/ (CAR-21)          | Done        |
| CAR-173 — Removal of legacy CLI data access layer                      | Done        |
| ESLint layer boundary and test quality rules (CAR-193)                 | Done        |
| Playwright E2E — POM foundation + initial behavioral coverage (CAR-63) | In Progress |

---

## Roadmap

Items in rough priority order. Backlog items are lower priority.

**Test infrastructure (CAR-3)**
Test database isolation via DB_PATH environment variable (CAR-16) to enable clean CI runs against an in-memory database. Splitting `test` into separate unit and integration scripts was considered during CAR-52's pre-commit setup, in anticipation of a future database migration (CAR-5) and a possible supplemental NoSQL store for job profile analysis (CAR-32) — deferred for now, since the current combined suite runs in seconds and the split would add maintenance surface without present benefit. Revisit when either migration becomes concrete.

**Data layer refactor (CAR-5)** _(In Progress)_
Single-table `lib/db/` modules are complete (CAR-20). The `lib/` orchestration layer now composes from these modules (CAR-21 — done), raw SQL has been eliminated from `server/routes/roles.ts` alongside the N+1 query fix (CAR-164), and the CLI scripts layer has been retired in favour of HTTP-level integration tests (CAR-165, CAR-166, CAR-167, CAR-168). CAR-173 is complete — `UpdateArgs` is gone, `lib/args/` is deleted, and `lib/updates.ts` now accepts the caller-agnostic `UpdateRoleInput`. Remaining work: move vocabulary validation into the orchestration layer (CAR-178), resolve `url` nullability mismatch (CAR-172), and fill one-to-many test coverage gaps (CAR-22 subtasks).

**Observability — error logging and persistence (CAR-139)**
Audit existing error handling across the codebase first (CAR-141), then implement consistent logging on the client (CAR-140) and server (CAR-72). Persist server logs to disk via Pino file transport (CAR-142). A full-stack persistent error store, spanning both client and server, is deferred until cloud migration planning begins (CAR-143).

**Contextual status tracking (CAR-116)**
Decompose the overloaded `role_status` field into separate triage status, application history status, and analysis status fields (CAR-118, CAR-119, CAR-120). Update filters and UI accordingly (CAR-117).

**Playwright full workflow coverage (CAR-63)** _(In Progress)_
Page objects and smoke tests cover all four pages. Role creation is tested end-to-end with field verification. Write mode UI behavior is covered on the SQL Query page. Remaining: role detail behavioral flows (status update, export, delete modals), SQL query execution, and test data isolation (CAR-16). A new epic (CAR-183) tracks decomposition of `RoleDetail.vue` into composables, which will improve the testability of the detail page flows before those E2E tests are written.

**Utilities section — Text Diff Visualizer (CAR-210)** _(In Progress)_
Client-side, stateless text diff tool for comparing resume versions — nav scaffold (CAR-211) and jsdiff integration (CAR-212) done; UI + render (CAR-213) in progress, E2E-covered, Vitest component coverage blocked on CAR-206 standing up `@vue/test-utils`. A second utility, resume-to-DOCX conversion (CAR-214), is scoped in the backlog under the same nav section.

**Playwright test data management (CAR-91)**
Fixture-based role creation and cleanup via semantic company name identification.

**Refactor RoleDetail.vue (CAR-99)** _(Backlog)_
Extract DeleteModal, ExportModal, ReasonModal, and AddReasonControl into dedicated components.

**npm workspace restructuring + ES module migration (CAR-4)** _(Backlog)_
Restructure into `@career-assistant/data`, `@career-assistant/server`, `@career-assistant/client` (CAR-17). Update import paths (CAR-18). Migrate to ES modules (CAR-19). Resolves the current vocabulary type duplication between `lib/types.ts` and `client/src/constants.ts`, and unblocks several `any`-suppression cleanups tracked in CAR-147. Includes an explicit decision point on ORM strategy (Prisma, Drizzle, or manual) — see CAR-170.

**SkillsGapTracker migration (CAR-6)** _(Backlog)_
Schema design (CAR-23), data layer and scripts (CAR-24), frontend integration (CAR-25).

**Claude workflow migration (CAR-7)**
Replace triage and career development Claude project workflows with direct API calls.

**LLM-powered job market analysis (CAR-32)** _(Backlog)_
Bulk ingestion pipeline (CAR-33), role classification and skill extraction (CAR-34), cloud and local LLM integration (CAR-35), market analysis dashboard (CAR-36).

**Analytics foundation (CAR-70)** _(Backlog)_
Pre-built aggregate queries and analytics view.

**Known bugs (Backlog)**
Role can simultaneously have skip and termination reasons (CAR-53). `request.body as any` on POST /api/roles, suppressed pending CAR-44 (CAR-61, CAR-148). `ref<any>` in Vue components, suppressed pending CAR-4 (CAR-62, CAR-147). POST reason endpoints pass role ID as string (CAR-103). Backup route blocks event loop with sync fs calls (CAR-104). Backup failure toast renders in success colours (CAR-138).

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
│   ├── types.ts             # Domain vocabulary types and runtime arrays
│   ├── roles.ts             # Role insertion with validation
│   ├── updates.ts           # Status update validation + orchestration
│   ├── deletes.ts           # Delete operations with FK awareness
│   ├── parse-records.ts     # Plain-text import format parser
│   ├── db/                  # Single-table CRUD modules
│   │   ├── index.ts         # db namespace — aggregates all modules for callers
│   │   ├── roles.db.ts
│   │   ├── skip-reasons.db.ts
│   │   ├── termination-reasons.db.ts
│   │   └── job-descriptions.db.ts
│   ├── exporters/           # Role export (simple + rich formats)
│   └── args/                # CLI argument parsers (update-args.ts — pending removal in CAR-173)
├── scripts/                 # Miscellaneous scripts
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
    ├── helpers/             # createTestDb()
    ├── unit/                # Pure function tests
    │   └── lib/db/          # Tests for single-table lib/db/ modules
    └── integration/         # Cross-layer integration tests
        └── routes/          # Fastify inject() HTTP route tests
            ├── roles.test.ts
            ├── query.test.ts
            └── backup.test.ts  # HTTP contract only — pending CAR-104/CAR-179
```

### Key design decisions

**lib/ and server/ separation** — all business logic lives in `lib/` with no I/O. Server routes and tests are callers of the same `lib/` functions. Chosen for: independent testability, shared logic across HTTP and test contexts.

**Three-layer architecture** — the codebase separates concerns across three distinct layers with a strict dependency direction: the HTTP layer owns transport concerns; the orchestration layer (`lib/`) owns business domain rules; the data layer (`lib/db/`) owns single-table primitives.

**lib/db/ as the data access layer** — single-table CRUD modules accessed via a db namespace object (db.roles, db.skipReasons, etc.)

**Validation in layers** — structural validation at the HTTP layer (is the input well-formed?), semantic/domain validation in `lib/` (is the status transition legal? are reasons required?), DB-layer enforcement via CHECK constraints and FK constraints. Each layer catches different failure modes.

**Runtime vocabulary arrays alongside union types** — TypeScript union types (`RoleStatus`, `SkipReasonType`, etc.) enforce vocabulary at compile time. Parallel runtime arrays (`VALID_STATUSES`, etc.) enable validation of external input at the network boundary. Both defined in `lib/types.ts`.

**SQLite with FK enforcement** — `PRAGMA foreign_keys = ON` in schema. Delete operations use preview/normal/force modes. UNIQUE constraint on `job_descriptions.role_id` enforces one-to-one relationship.

**In-memory test databases** — all tests use `better-sqlite3`'s `:memory:` mode via `createTestDb()`. Each test gets a fresh isolated instance via `beforeEach`/`afterEach`. Real SQL, real constraints, no cleanup.

**HTTP integration tests via Fastify inject()** — integration tests use Fastify's built-in `inject()` method to fire requests directly against route handlers in-process. Each test registers a fresh Fastify instance and in-memory SQLite database, keeping tests isolated and fast.

**Server/client split** — Fastify on port 3000, Vite on port 5173 proxying `/api` in development. Chosen to keep the backend deployment-ready for future cloud architecture without structural changes.

**Co-located configuration** — each module owns its TypeScript and tool configuration: Vue, Playwright, and the root Node.js data layer. ESLint is a deliberate exception.

**Formatting owned entirely by Prettier** — ESLint enforces code quality rules; Prettier owns all visual formatting, including brace placement.

**Quality gates enforced locally, not just in CI** — a Husky pre-commit hook runs Prettier (via lint-staged, scoped to staged files only) and the full unit/integration suite.

### Technology choices

| Concern        | Choice                                                  | Rationale                                                                |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Database       | SQLite + better-sqlite3                                 | Local-first, zero infrastructure, synchronous API                        |
| Language       | TypeScript 6 (strict), ES2024 target                    | Type safety for domain vocabulary, compile-time correctness, Map.groupBy |
| Test framework | Vitest                                                  | Native TypeScript, Vite-native, Jest-compatible API                      |
| E2E framework  | Playwright                                              | Cross-browser, POM support, first-class TypeScript                       |
| HTTP server    | Fastify                                                 | TypeScript-native, performant, plugin architecture, inject() for testing |
| Frontend       | Vue 3 (Composition API)                                 | Vite-native, same author as Vite, clean TS integration                   |
| CSS            | Tailwind CSS v4                                         | Utility-first, `@theme`-based custom tokens                              |
| Linting        | ESLint (flat config)                                    | TypeScript-aware, Vue-aware, Playwright-aware rule sets in one pass      |
| Formatting     | Prettier + eslint-config-prettier + Husky + lint-staged | Automatic, zero-decision formatting and test enforcement on every commit |
| Runtime        | Node.js 24                                              | LTS, compatible with better-sqlite3 v12+, json_each SQLite 3.38+         |
| License        | GPL v3                                                  | Copyleft — derivative works must remain open source                      |
