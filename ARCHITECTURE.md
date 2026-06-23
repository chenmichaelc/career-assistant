# Architecture

This document goes deeper than the README on the design decisions behind career-assistant. It serves as persistent context for contributors and future development sessions — including future Claude sessions picking up this codebase without the benefit of having been present for the original decisions.

## Contents

1. [Repository structure](#repository-structure)
2. [Layer architecture](#layer-architecture)
3. [Data layer](#data-layer)
4. [Validation architecture](#validation-architecture)
5. [Test philosophy](#test-philosophy)
6. [Server and client](#server-and-client)
7. [Code quality and formatting](#code-quality-and-formatting)
8. [CI/CD](#cicd)
9. [TypeScript conventions](#typescript-conventions)
10. [Configuration co-location](#configuration-co-location)
11. [Observability](#observability)
12. [Planned evolution](#planned-evolution)

---

## Repository structure

```
career-assistant/
├── .nvmrc                          # Node.js version pin (24)
├── .prettierrc.json                # Prettier formatting configuration
├── .prettierignore                 # Paths excluded from Prettier
├── .husky/
│   └── pre-commit                  # lint-staged (Prettier on staged files), then npm run test:run
├── .github/
│   └── workflows/
│       ├── push.yml                # CI — runs on every push, includes lint gate
│       └── pull-request.yml        # CI — runs on every pull request, includes lint gate
├── eslint.config.mts               # ESLint flat config — root-level, governs all layers
├── vitest.config.ts                # Vitest config — excludes Playwright specs from unit/integration runs
├── db/
│   ├── schema.ts                   # Single source of truth for SQLite schema (definitions only)
│   └── setup.ts                    # Exports applySchema() for server and test use
├── lib/                            # Business logic — no I/O, independently testable
│   ├── types.ts                    # Domain vocabulary types and runtime arrays
│   ├── roles.ts                    # Role insertion with validation
│   ├── updates.ts                  # Status update validation + orchestration
│   ├── deletes.ts                  # Delete operations with FK awareness
│   ├── parse-records.ts            # Plain-text import format parser
│   ├── db/                         # Single-table CRUD modules
│   │   ├── index.ts                # db namespace — aggregates all modules for callers
│   │   ├── roles.db.ts
│   │   ├── skip-reasons.db.ts
│   │   ├── termination-reasons.db.ts
│   │   └── job-descriptions.db.ts
│   ├── exporters/
│   │   ├── index.ts                # Export entry point + format type
│   │   ├── simple.ts               # company + title + JD format
│   │   └── rich.ts                 # Importer-compatible format
│   └── args/
│       └── update-args.ts          # CLI argument parser — pending removal (CAR-173)
├── scripts/
│   └── init-db.ts                  # One-time DB initialization — calls applySchema() only
├── server/
│   ├── package.json                # Server-scoped dependencies (early workspace structure)
│   ├── index.ts                    # Fastify server setup + route registration
│   └── routes/
│       ├── roles.ts                # Role CRUD, status updates, reason management
│       ├── query.ts                # Raw SQL query endpoint
│       └── backup.ts               # DB backup endpoint
├── client/
│   ├── tsconfig.json               # Thin reference file — points to app and node configs
│   ├── tsconfig.app.json           # Browser-targeted TypeScript config for src/
│   ├── tsconfig.node.json          # Node-targeted TypeScript config for vite.config.ts
│   ├── vite.config.ts              # Vite config with Vue plugin + API proxy
│   └── src/
│       ├── main.ts                 # Vue app entry point
│       ├── App.vue                 # Root component — nav bar + router view
│       ├── constants.ts            # Frontend vocabulary constants
│       ├── composables/
│       │   └── useApi.ts           # Typed fetch wrapper with error handling
│       └── views/
│           ├── RoleList.vue        # Role list with multi-select filter + column sort
│           ├── RoleDetail.vue      # Role detail, status updates, reason management
│           ├── AddRole.vue         # Role creation form
│           └── SqlQuery.vue        # Raw SQL interface with CSV export
├── e2e/
│   ├── package.json                # E2E-scoped dependencies
│   ├── playwright.config.ts        # Playwright config — webServer, baseURL, reporters
│   ├── tsconfig.json               # ESNext TypeScript config for Playwright
│   ├── pages/
│   │   ├── topMenuBarComponent.ts  # Shared nav bar component (data-testid scoped)
│   │   └── rolesPage.ts            # Roles page object
│   └── tests/
│       └── smoke.spec.ts           # Smoke test — full stack connectivity
└── tests/
    ├── helpers/
    │   └── db.ts                   # createTestDb() — in-memory SQLite with schema
    ├── unit/                       # Pure function tests
    │   └── lib/db/                 # Tests for single-table lib/db/ modules
    └── integration/                # Fastify inject() HTTP route tests
        └── routes/
            ├── roles.test.ts
            ├── query.test.ts
            └── backup.test.ts      # HTTP contract only — pending CAR-104/CAR-179
```

---

## Layer architecture

The codebase has three layers with a strict dependency direction: each layer may only depend on layers below it, never above.

```
HTTP routes (server/routes/)     Tests (tests/)
        │                              │
        └──────────────────────────────┘
                        │
                  lib/ — orchestration layer
                        │
                  lib/db/ — data access layer
                        │
                  SQLite database
```

**HTTP layer (`server/routes/`)** — owns everything about the HTTP protocol: request parsing, response shaping, status codes, content negotiation. Route handlers translate HTTP input into domain types, call the orchestration layer, and translate the result back into HTTP responses. They contain almost no logic of their own — any conditional that isn't about HTTP concerns belongs in `lib/`.

**Orchestration layer (`lib/`)** — owns business domain rules: what constitutes a valid status transition, what dependents must be cleaned up on delete, what the `applied_date` auto-set rule is. Has no knowledge of how it was called (HTTP, test, or otherwise).

**Data layer (`lib/db/`)** — owns single-table primitives. Returns `undefined` for missing records. Never throws on missing data. Never enforces domain rules. The boundary is enforced at every call site by the `db` namespace pattern: `db.roles.getById(sqlite, id)` is always a data layer call.

**Boundary rules**

- The HTTP layer may call the orchestration layer and the data layer directly. It never contains business logic.
- The orchestration layer may call the data layer. It never knows about HTTP.
- The data layer is table-scoped and stateless. It never calls up to the orchestration layer.

All business logic lives in `lib/` with no I/O dependencies. Scripts, server routes, and tests are all callers of the same `lib/` functions.

---

## Data layer

### Schema design

The SQLite schema enforces domain vocabulary at the database layer via CHECK constraints:

```sql
role_status TEXT CHECK(role_status IN ('Applied', 'Pending Triage', ...))
candidacy   TEXT CHECK(candidacy   IN ('Strong', 'Moderate', ...))
```

This means invalid data cannot be persisted regardless of which caller layer is used. Application-layer validation catches errors earlier and with better messages, but the DB layer is the final guarantee.

Foreign key enforcement is explicitly enabled:

```sql
PRAGMA foreign_keys = ON;
```

This is not the SQLite default — it must be set per connection. All DB connections in the codebase set this pragma.

### Delete modes

Roles have dependents across three tables: `skip_reasons`, `termination_reasons`, and `job_descriptions`. Three delete modes are supported:

- **Preview** — returns what would be deleted without deleting anything
- **Normal** — deletes the role only if it has no skip/termination reasons (job descriptions are always cascade-deleted)
- **Force** — deletes the role and all dependents unconditionally

The rationale: skip and termination reasons are analytical annotations. Silently deleting them loses data that may have analytical value. Force delete is explicit and intentional.

### Single-table modules (`lib/db/`)

CRUD operations for individual tables are implemented as dedicated modules under `lib/db/`. Each module owns the primitives for its table and defines its own row-level types (`SkipReasonRow`, `TerminationReasonRow`, etc.) co-located with the SQL that produces and consumes them.

**The `db` namespace**

`lib/db/index.ts` aggregates all modules into a single `db` namespace object:

```typescript
import { db } from './db';

db.roles.getById(sqlite, id);
db.skipReasons.getAllByRoleId(sqlite, roleId);
db.jobDescriptions.deleteByRoleId(sqlite, roleId);
```

This mirrors the call pattern of ORM clients (Drizzle, Prisma) and makes the data layer boundary visible at every call site — `db.tableName.operation()` is always a data layer call, never business logic. The raw `better-sqlite3` connection parameter is named `sqlite` throughout the codebase; `db` is reserved exclusively for this namespace object. This architectural pattern was selected to stage the codebase for future ORM usage and database migration onto a cloud-ready infrastructure.

**Policy decisions belong in the orchestration layer**

`lib/db/` functions are neutral primitives. They return `undefined` for missing records — they never throw on missing data, and they never enforce domain rules. The decision of whether a missing record is an error belongs to the orchestration layer.

**Type ownership**

Row-level types (`SkipReasonRow`, `TerminationReasonRow`, `JobDescriptionRow`, `RoleInsertData`) are defined in their respective `lib/db/` modules, co-located with the queries that use them. This is intentional — these types describe persistence shapes that change together with the SQL that produces them. A database schema change touches the module and its types in one place.

The `lib/db/index.ts` barrel re-exports all row types so callers can import from one place:

```typescript
import { db, SkipReasonRow, TerminationReasonRow } from '../../lib/db';
```

Domain vocabulary types (`RoleStatus`, `SkipReasonType`, etc.) remain in `lib/types.ts` — they are not persistence-specific and are imported by `lib/db/` modules, not defined there. The dependency direction is: `lib/types.ts` → `lib/db/` → `lib/` orchestration → callers.

**Bulk fetching with `json_each`**

The `getAllByRoleIds` functions on `skip-reasons.db.ts` and `termination-reasons.db.ts` use SQLite's `json_each()` to avoid the 999-variable limit on `IN (?, ?, ...)` queries:

```sql
WHERE role_id IN (SELECT value FROM json_each(?))
```

The array is passed as `JSON.stringify(roleIds)` — a single bound parameter regardless of list size. This also benefits prepared statement reuse since the query shape is constant.

**ORM consideration (CAR-4)**

The current `lib/db/` design positions the codebase well for a future ORM migration. The `db.tableName.operation()` call pattern at orchestration layer call sites is intentionally consistent with how Drizzle and Prisma clients work. CAR-4 includes an explicit decision point (CAR-170) to evaluate Drizzle, Prisma, or continued manual SQL before restructuring the workspace — whichever is chosen, the call sites require minimal change.

### Vocabulary types and runtime arrays

Each vocabulary type is defined twice — once as a TypeScript union type, once as a runtime array:

```typescript
export type RoleStatus = 'Applied' | 'Pending Triage' | 'Skipped' | ...;
export const VALID_STATUSES: RoleStatus[] = ['Applied', 'Pending Triage', 'Skipped', ...];
```

The union type enforces valid values at compile time. The runtime array enables validation of external input — API request bodies — that the type system cannot check because it's erased at runtime. The array is typed as `RoleStatus[]`, so the TypeScript compiler enforces that the two stay in sync.

Both are defined in `lib/types.ts`. The client imports its own copy from `client/src/constants.ts` — a known duplication that will be resolved when CAR-4 (workspace restructuring) introduces shared packages. Several `@typescript-eslint/no-explicit-any` suppressions in the client (tracked in CAR-147) exist specifically because of this duplication.

---

## Validation architecture

Validation is split across three layers with different concerns:

### Layer 1 — HTTP layer (`server/routes/`)

Structural validity: is the wire input well-formed? Are required fields present? Are values non-empty? Are vocabulary values in the allowed set?

The last point — vocabulary validation — currently lives in the HTTP layer for the reason management endpoints (skip reasons, termination reasons). This is a known mis-placement: vocabulary validity is a domain rule, not a structural concern, and belongs in the orchestration layer. Tracked for cleanup in CAR-178.

### Layer 2 — Orchestration layer (`lib/`)

Semantic validity: does the input make sense in domain terms? Is the status transition legal? Are skip reasons required for this status? Does the role exist?

```typescript
// Example: skip reasons required when transitioning to Skipped
if (newStatus === 'Skipped' && reasons.length === 0) {
  throw new Error('At least one skip reason is required when status is Skipped.');
}
```

### Layer 3 — SQLite CHECK constraints

Persistence-layer enforcement: the database rejects values that violate the schema regardless of application-layer validation.

Each layer catches different failure modes. Layer 1 catches malformed requests. Layer 2 catches domain rule violations. Layer 3 is the final backstop that prevents data corruption even if the application layers have a bug.

---

## Test philosophy

### Unit tests (`tests/unit/`)

Pure function tests using Vitest with in-memory SQLite databases via `createTestDb()`. Each test gets a fresh database instance:

```typescript
let db: Database.Database;
beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  db.close();
});
```

`createTestDb()` applies the real schema to a `:memory:` database. Tests execute real SQL against real constraints — there are no mocks of the data layer. This gives real constraint enforcement (FK violations, CHECK violations) in tests that are fast, isolated, and require no cleanup.

### Integration tests (`tests/integration/`)

HTTP route tests using Fastify's built-in `inject()` method. Each test registers a fresh Fastify instance and a fresh in-memory SQLite database, keeping tests completely isolated:

```typescript
beforeEach(async () => {
  sqlite = createTestDb();
  app = Fastify();
  await app.register(rolesRouter, { prefix: '/api/roles', db: sqlite });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  sqlite.close();
});
```

`inject()` fires requests directly against the route handlers in-process without opening a network socket. This makes the tests fast, reliable, and independent of any running server process — they run alongside the unit tests as part of `npm run test:run`.

**Test variable naming conventions** — response variables are named to reflect what the request is doing, not what it is: `roleCreationResponse`, `invalidRoleDeletionResponse`, `exportResponse`, `previewResponse`. This is especially important in tests with multiple `inject()` calls.

### E2E tests (`e2e/`)

Playwright browser tests against the running application. The Page Object Model pattern is used throughout, with shared UI zones extracted into component classes:

```typescript
// TopMenuBarComponent scopes locators to the data-testid="menu-bar" container
this.topMenuBarContainer = page.getByTestId('menu-bar');
this.rolesLink = this.topMenuBarContainer.getByRole('link', { name: 'roles' });
```

The `data-testid` attribute is placed on zone containers only — not on individual interactive elements. Natural ARIA role/name selectors are used within the scoped container.

### The XP safety net

The test suite was designed to enable Extreme Programming practices. With thorough coverage of all pure functions and data layer operations, changes can be made — alone or with an LLM assistant — with high confidence that regressions are caught immediately. The test pyramid (unit → integration → E2E) was deliberately chosen to maximise coverage while keeping each layer independently testable and fast.

---

## Server and client

### Why separate processes

The Fastify server (port 3000) and Vue client (port 5173) run as separate processes communicating over HTTP. This is more architecture than a purely local tool requires. The rationale:

- Keeps the backend deployment-ready for future cloud architecture without structural changes
- Enables the API to be called independently of the frontend — useful for testing workflows
- Forces a clean separation between data concerns (server) and presentation concerns (client)

In development, Vite proxies `/api` requests to the server:

```typescript
proxy: {
  '/api': { target: 'http://localhost:3000', changeOrigin: true }
}
```

### Health endpoint

The server exposes a `/healthcheck` endpoint that returns `{ status: 'ok' }`. This is used by Playwright's `webServer` readiness check to determine when the server is ready to accept test traffic, and will be used by future monitoring infrastructure.

---

## Code quality and formatting

### ESLint (CAR-37)

`eslint.config.mts` lives at the repository root rather than being co-located within a specific module. This is a deliberate exception to the "configuration lives with the module it governs" principle described below — ESLint needs to lint `lib/`, `scripts/`, `server/`, `client/`, `tests/`, and `e2e/` in a single pass, with different rule sets and language options applied per layer based on `files` globs within one config. Splitting it per module would mean multiple invocations and multiple configs to keep in sync, defeating the purpose of the flat config format.

Key conventions enforced:

- **Unused variables and parameters** — `@typescript-eslint/no-unused-vars`, configured with `varsIgnorePattern`, `argsIgnorePattern`, and `caughtErrorsIgnorePattern` all set to `^_`. A parameter or variable prefixed with an underscore signals it's intentionally unused — required by a function signature (e.g. a Fastify route handler that doesn't need `request`) but not referenced in the body. Where neither parameter in a handler is used, the convention is to omit trailing unused parameters entirely (`async () => {}`) rather than prefix them, since JavaScript allows omitting parameters from the right end of a signature but not from the middle — `async (reply) => {}` would silently and incorrectly bind the request object to a variable named `reply`.
- **`no-explicit-any`** — most `any` usages in the codebase are suppressed with `eslint-disable-next-line` and an inline comment explaining why, referencing the ticket that will resolve the underlying gap (see CAR-147 for suppressions blocked on CAR-4's shared-types work, and CAR-148 for the one blocked on CAR-44's schema validation work). Two suppressions in `SqlQuery.vue` are permanent and intentionally excluded from any cleanup ticket — the SQL query interface accepts arbitrary user-supplied SQL, so the result shape is genuinely unknowable at compile time, by design, with no future state in which a real type becomes possible.
- **`brace-style` — added, then removed.** During CAR-37, the codebase adopted `stroustrup` brace style (catch/finally on a new line) as an explicit ESLint rule. When Prettier was introduced (CAR-52), this created an unresolvable conflict: Prettier has no configurable option for brace placement — it always formats `catch`/`finally` on the same line, by hardcoded design, with no override available. Rather than fight Prettier on a single rule, the project let Prettier own all formatting concerns without exception; the stroustrup rule was removed and the codebase reverted to same-line brace style as part of CAR-52's first formatting pass. CAR-51 documents the original decision and remains a record of it, even though it was later reversed.

### Prettier and eslint-config-prettier (CAR-52)

`.prettierrc.json` governs all visual formatting. `eslint-config-prettier` is included as the final entry in the `eslint.config.mts` config array, disabling any ESLint formatting rule that would otherwise conflict with Prettier's output.

Formatting and a fast test run are enforced automatically on every commit via **Husky** and **lint-staged**, not just available as manual scripts:

- Husky manages Git hooks in a way that's tracked by the repository (`.husky/`) and automatically activated for any contributor via the `prepare` script, which npm runs as part of `npm install`. This avoids the standard problem of raw Git hooks living in the untracked `.git/hooks/` directory and not being shared when the repo is cloned.
- lint-staged restricts a given command to only the files staged for the current commit, rather than running across the whole codebase on every commit.
- The `pre-commit` hook runs two steps in sequence:

  ```bash
  npx lint-staged
  npm run test:run
  ```

  `lint-staged` runs `prettier --write` against staged `.ts`, `.mts`, `.vue`, `.js`, `.json`, and `.md` files; formatting changes are automatically re-staged and included in the commit. `npm run test:run` (`vitest --run`) then runs the full unit and integration suite once, non-interactively, and blocks the commit if anything fails — the bare `npm test` script defaults to Vitest's watch mode, which never exits and would hang the hook indefinitely.

This guarantees every commit landing in the repository is correctly formatted and passes the fast test tier, without relying on a contributor's memory or editor configuration. A CI-level Prettier backstop (`prettier --check .`, to catch commits made with `--no-verify`) was considered but not yet implemented — see CAR-52 for the open consideration.

---

## CI/CD

Two GitHub Actions workflows run linting and the full test suite — unit, integration, and Playwright E2E — on every push and every pull request. Both workflows are identical in steps:

1. Checkout repository
2. Set up Node.js 24
3. Install root dependencies (`npm ci`)
4. Install client dependencies (`npm ci` in `client/`)
5. **Run ESLint (`npm run lint`)**
6. Initialise the database (`npm run init`)
7. Run Vitest unit and integration tests (`npm run test:run`)
8. Install Playwright browsers (`npx playwright install --with-deps`)
9. Run Playwright E2E tests (`npm run test:e2e`)
10. Upload Playwright HTML report as a GitHub artifact (retained for 30 days)

The lint step is deliberately sequenced immediately after dependency installation and before any other check — it's the cheapest possible gate, so a contributor gets the fastest possible feedback before waiting for the rest of the pipeline.

The Playwright report upload runs unconditionally (`if: ${{ !cancelled() }}`) so test results are always available for review even when tests fail.

A merge gate requiring this pipeline to pass before merging is configured via GitHub branch protection rules (CAR-145) — this is a repository setting, not something expressible in the workflow YAML itself.

A meaningful subset of this pipeline — formatting and the fast test tier — also runs locally on every commit via the pre-commit hook described above. CI remains the authoritative gate, since it additionally runs ESLint and the full Playwright suite, but the local hook catches the most common failures earlier.

---

## TypeScript conventions

### Four tsconfigs

Four distinct TypeScript configurations cover the distinct runtime environments in the project:

| Config                      | Target | Module         | Environment                        |
| --------------------------- | ------ | -------------- | ---------------------------------- |
| `tsconfig.json` (root)      | ES2024 | CommonJS       | Node.js, ts-node                   |
| `client/tsconfig.app.json`  | ESNext | ESNext/bundler | Browser, Vite                      |
| `client/tsconfig.node.json` | ESNext | ESNext/bundler | Node.js, for `vite.config.ts` only |
| `e2e/tsconfig.json`         | ESNext | ESNext/bundler | Node.js, Playwright                |

The root config uses CommonJS because `ts-node` — used to run CLI scripts and the server — requires it. The client and e2e configs use ESNext because Vite and Playwright handle their own TypeScript compilation and work with native ES modules.

`client/tsconfig.json` itself is a thin reference file with no compiler options — it exists only to point TypeScript project references at `tsconfig.app.json` and `tsconfig.node.json`. This split exists because `vite.config.ts` uses Node built-ins (`path`, `__dirname`) that don't belong in the browser-targeted app config. `client/tsconfig.node.json` requires `@types/node` as a real devDependency in `client/package.json` — omitting it causes `npm ci` to fail in CI with a lock-file mismatch error, since the package wouldn't be present in `package-lock.json` despite being referenced by the tsconfig's `types` array.

### Strict mode

All configs use `strict: true`. `client/tsconfig.app.json` additionally enables `noUnusedLocals` and `noUnusedParameters` — overlapping with, but independent of, ESLint's `no-unused-vars` rule, since one operates at the TypeScript compiler level and the other at the linter level.

---

## Configuration co-location

Each module owns its configuration files, with one deliberate exception:

- `client/tsconfig.app.json` / `client/tsconfig.node.json` — Vue frontend TypeScript config
- `e2e/playwright.config.ts` — Playwright config
- `e2e/tsconfig.json` — Playwright TypeScript config
- `eslint.config.mts` — **the exception.** Lives at the repository root because it needs to govern all layers simultaneously in one pass. See [Code quality and formatting](#code-quality-and-formatting) above.

The root `tsconfig.json` covers the Node.js data layer (`db/`, `lib/`, `scripts/`, `server/`, `tests/`).

The `server/package.json` and `e2e/package.json` are early steps toward the CAR-4 workspace restructuring — each module beginning to own its own dependency manifest.

This pattern follows the principle that things which change together should live together — and that things which must govern everything at once, like ESLint, are the exception to that principle rather than a violation of it.

---

## Observability

Tracked under the CAR-139 epic. Errors on both the client and server were initially either silently swallowed or written to ephemeral outputs — `console.error` to the browser console, or Fastify's default Pino output to terminal stdout — with no persistence across sessions or process restarts.

The work is deliberately sequenced:

1. **Audit first (CAR-141)** — a full pass across `server/`, `client/src/`, `lib/`, and `scripts/` to catalogue every catch block by category: missing logging, named-but-unused error bindings, silent swallows, or already-adequate handling. This audit's findings directly scope the two implementation tickets below.
2. **Server-side structured logging (CAR-72)** and **client-side console logging (CAR-140)** are tracked as separate stories because they have genuinely different solutions — the server already has Pino available via Fastify, while the browser has no native persistence mechanism and `console.error` is the realistic baseline for a local-only tool.
3. **Server-side log persistence (CAR-142)** adds a Pino file transport so server logs survive process restarts — explicitly scoped to the server only, since browser-side persistence requires either a server endpoint to POST to, or is deferred entirely.
4. **A full-stack persistent error store (CAR-143)** spanning both client and server — via a dedicated logging service, a self-hosted solution, or a SQLite-backed error log table consistent with the rest of the stack — is deliberately deferred as an Idea-stage ticket, not scheduled work. The stated tipping point: implement before the first non-local deployment, since a hosted multi-user system cannot rely on a developer being present to notice and reproduce failures the way a local single-user tool can.

---

## Planned evolution

### CAR-4 — npm workspace restructuring + ES module migration

The repository will be restructured as a proper npm monorepo with three workspace packages:

```
packages/
├── data/         @career-assistant/data    (lib/, db/, scripts/)
├── server/       @career-assistant/server  (server/)
└── client/       @career-assistant/client  (client/)
```

Each package will have its own `tsconfig.json` and `package.json`. The root `tsconfig.json` will become a thin references file. All packages will migrate from CommonJS to ES modules as part of the same pass.

This resolves the current duplication of vocabulary types between `lib/types.ts` and `client/src/constants.ts` — the client will import directly from `@career-assistant/data`. It also unblocks several `@typescript-eslint/no-explicit-any` suppressions currently tracked in CAR-147.

CAR-4 includes an explicit prerequisite decision (CAR-170): evaluate and select an ORM strategy — Drizzle, Prisma, or continued manual SQL — before restructuring begins. This decision affects the package boundary design and may eliminate the need to manually maintain row types and migration scripts. Background reading is tracked in CAR-171.

### CAR-5 — Data layer refactor

Single-table CRUD operations have been extracted into dedicated modules under `lib/db/` (CAR-20, **complete**). The `lib/` orchestration layer has been refactored to compose from these modules (CAR-21, **complete** for orchestration and route layers):

- `lib/deletes.ts`, `lib/roles.ts`, `lib/updates.ts` — refactored (CAR-162, CAR-163)
- `server/routes/roles.ts` — refactored, N+1 eliminated (CAR-164)
- CLI scripts layer retired (CAR-165, CAR-166)
- Fastify `inject()` integration tests complete (CAR-167). The backup test is intentionally limited to HTTP contract verification pending CAR-104 and CAR-179.
- Final SQL audit pending (CAR-168)

Remaining cleanup tracked separately under CAR-5: decoupling `lib/updates.ts` from `lib/args/` (CAR-173), moving vocabulary validation to the orchestration layer (CAR-178), resolving the `url` nullability mismatch between `RoleInsertData` and the schema (CAR-172).

### CAR-32 — LLM-powered job market analysis

The planned market intelligence features will introduce a fourth layer: an analysis pipeline that consumes role data and produces structured market signals. This will likely introduce Pinia stores on the frontend (CAR-100) to manage shared state across analysis views, and a bulk ingestion pipeline on the backend for large-scale job posting data. Runtime schema validation (CAR-44) is explicitly called out as a prerequisite once this pipeline begins ingesting genuinely untrusted external data — job board APIs, LLM API responses — rather than the internally-controlled data the application currently handles.
