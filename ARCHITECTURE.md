# Architecture

This document goes deeper than the README on the design decisions behind career-assistant. It serves as persistent context for contributors and future development sessions.

## Contents

1. [Repository structure](#repository-structure)
2. [Layer architecture](#layer-architecture)
3. [Data layer](#data-layer)
4. [Validation architecture](#validation-architecture)
5. [Test philosophy](#test-philosophy)
6. [Server and client](#server-and-client)
7. [CI/CD](#cicd)
8. [TypeScript conventions](#typescript-conventions)
9. [Configuration co-location](#configuration-co-location)
10. [Planned evolution](#planned-evolution)

---

## Repository structure

```
career-assistant/
├── .nvmrc                          # Node.js version pin (24)
├── .github/
│   └── workflows/
│       ├── push.yml                # CI — runs on every push
│       └── pull-request.yml        # CI — runs on every pull request
├── db/
│   ├── schema.ts                   # Single source of truth for SQLite schema (definitions only)
│   └── setup.ts                    # Exports applySchema() for server and test use
├── lib/                            # Business logic — no I/O, independently testable
│   ├── types.ts                    # Shared types + runtime vocabulary arrays
│   ├── roles.ts                    # Role insertion with validation
│   ├── updates.ts                  # Status update validation + orchestration
│   ├── deletes.ts                  # Delete operations with FK awareness
│   ├── parse-records.ts            # Plain-text import format parser
│   ├── exporters/
│   │   ├── index.ts                # Export entry point + format type
│   │   ├── simple.ts               # company + title + JD format
│   │   └── rich.ts                 # Importer-compatible format
│   └── args/
│       ├── update-args.ts          # CLI argument parser for update-status
│       └── list-args.ts            # CLI argument parser for list-roles
├── scripts/                        # CLI entry points — thin I/O wrappers over lib/
│   ├── init-db.ts                  # One-time DB initialization — calls applySchema()
├── server/
│   ├── package.json                # Server-scoped dependencies (early workspace structure)
│   ├── index.ts                    # Fastify server setup + route registration
│   └── routes/
│       ├── roles.ts                # Role CRUD, status updates, reason management
│       ├── query.ts                # Raw SQL query endpoint
│       └── backup.ts               # DB backup endpoint
├── client/
│   ├── tsconfig.json               # Browser-targeted TypeScript config
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
    │   ├── db.ts                   # createTestDb() — in-memory SQLite with schema
    │   └── run-script.ts           # runScript() — spawn CLI scripts as child processes
    ├── unit/                       # Pure function tests
    └── integration/                # CLI script tests (black box via child process)
```

---

## Layer architecture

The codebase has three caller layers and one logic layer:

```
CLI scripts (scripts/)     HTTP routes (server/routes/)     Tests (tests/)
        │                           │                              │
        └───────────────────────────┴──────────────────────────────┘
                                    │
                              lib/ — business logic
                                    │
                              SQLite database
```

All business logic lives in `lib/` with no I/O dependencies. Scripts, server routes, and tests are all callers of the same `lib/` functions. This means:

- The data layer is independently testable without starting a server or spawning a process
- Logic is never duplicated between CLI and HTTP surfaces
- Tests exercise the real implementation, not a mock

The `scripts/` layer is deliberately thin — open a DB connection, call a `lib/` function, write to stdout, exit. No business logic belongs in scripts.

The `server/routes/` layer is the HTTP projection of the same functions. A known gap (CAR-42, CAR-20 through CAR-22) is that some raw SQL queries exist in route handlers that should be extracted into `lib/` modules.

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

### Vocabulary types and runtime arrays

Each vocabulary type is defined twice — once as a TypeScript union type, once as a runtime array:

```typescript
export type RoleStatus = 'Applied' | 'Pending Triage' | 'Skipped' | ...;
export const VALID_STATUSES: RoleStatus[] = ['Applied', 'Pending Triage', 'Skipped', ...];
```

The union type enforces valid values at compile time. The runtime array enables validation of external input — CLI arguments, API request bodies — that the type system cannot check because it's erased at runtime. The array is typed as `RoleStatus[]`, so the TypeScript compiler enforces that the two stay in sync.

Both are defined in `lib/types.ts`. The client imports its own copy from `client/src/constants.ts` — a known duplication that will be resolved when CAR-4 (workspace restructuring) introduces shared packages.

---

## Validation architecture

Validation is split across three layers with different concerns:

### Layer 1 — Argument parsers (`lib/args/`)

Syntactic validity: is the input well-formed? Are required flags present? Are values non-empty? Are there unknown flags?

```typescript
// Example: unknown flag detection
const unknownFlags = Object.keys(args).filter((k) => !KNOWN_FLAGS.includes(k));
if (unknownFlags.length > 0) throw new Error(`Unknown flags: ${unknownFlags.join(', ')}`);
```

### Layer 2 — `lib/` functions

Semantic validity: does the input make sense in domain terms? Is the status transition legal? Are skip reasons required for this status? Does the role exist?

```typescript
// Example: skip reasons required when transitioning to Skipped
if (newStatus === 'Skipped' && reasons.length === 0) {
  throw new Error('At least one skip reason is required when status is Skipped.');
}
```

### Layer 3 — SQLite CHECK constraints

Persistence-layer enforcement: the database rejects values that violate the schema regardless of application-layer validation.

Each layer catches different failure modes. Layer 1 catches malformed CLI invocations. Layer 2 catches domain rule violations. Layer 3 is the final backstop that prevents data corruption even if the application layers have a bug.

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

CLI script tests via child process spawning using `runScript()`. Each test invokes the actual script binary with stdin/stdout/stderr capture:

```typescript
const { stdout, exitCode } = runScript('add-role.ts', JSON.stringify(validRole));
expect(exitCode).toBe(0);
expect(stdout.trim()).toMatch(/^\d+$/);
```

These are black-box tests — they test the CLI contract (exit codes, stdout format, error messages) independently of the implementation. A structured log records inserted IDs for cleanup between test runs.

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
- Enables the API to be called independently of the frontend — useful for testing and CLI workflows
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

## CI/CD

Two GitHub Actions workflows run the full test suite — unit, integration, and Playwright E2E — on every push and every pull request. Both workflows are identical in steps:

1. Checkout repository
2. Set up Node.js 24
3. Install root dependencies (`npm ci`)
4. Install client dependencies (`npm ci` in `client/`)
5. Install E2E dependencies (`npm ci` in `e2e/`)
6. Initialise the database (`npm run init`)
7. Run Vitest unit and integration tests (`npm run test`)
8. Install Playwright browsers (`npx playwright install --with-deps`)
9. Run Playwright E2E tests (`npm run test:e2e`)
10. Upload Playwright HTML report as a GitHub artifact (retained for 30 days)

The Playwright report upload runs unconditionally (`if: ${{ !cancelled() }}`) so test results are always available for review even when tests fail.

---

## TypeScript conventions

### Three tsconfigs

Three distinct TypeScript configurations cover three distinct runtime environments:

| Config                 | Target | Module         | Environment         |
| ---------------------- | ------ | -------------- | ------------------- |
| `tsconfig.json` (root) | ES2020 | CommonJS       | Node.js, ts-node    |
| `client/tsconfig.json` | ESNext | ESNext/bundler | Browser, Vite       |
| `e2e/tsconfig.json`    | ESNext | ESNext/bundler | Node.js, Playwright |

The root config uses CommonJS because `ts-node` — used to run CLI scripts and the server — requires it. The client and e2e configs use ESNext because Vite and Playwright handle their own TypeScript compilation and work with native ES modules.

### Strict mode

All three configs use `strict: true`. The most impactful strict checks in practice are `strictNullChecks` (variables can't silently be null) and `noImplicitAny` (types must be explicit). These were treated as first-class constraints from the start.

### Brace style

`catch` and `finally` blocks open on a new line, separate from the closing brace of the preceding block:

```typescript
try {
  // ...
} catch (err) {
  // ...
} finally {
  // ...
}
```

This is the `stroustrup` brace style. It will be enforced via ESLint when CAR-37 is implemented.

---

## Configuration co-location

Each module owns its configuration files:

- `client/tsconfig.json` — Vue frontend TypeScript config
- `e2e/playwright.config.ts` — Playwright config
- `e2e/tsconfig.json` — Playwright TypeScript config

The root `tsconfig.json` covers the Node.js data layer (`db/`, `lib/`, `scripts/`, `tests/`).

The `server/package.json` and `e2e/package.json` are early steps toward the CAR-4 workspace restructuring — each module beginning to own its own dependency manifest.

This pattern follows the principle that things which change together should live together.

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

This resolves the current duplication of vocabulary types between `lib/types.ts` and `client/src/constants.ts` — the client will import directly from `@career-assistant/data`.

### CAR-5 — Data layer refactor _(In Progress)_

Single-table CRUD operations are being extracted into dedicated modules under `lib/db/`:

```
lib/db/
├── roles.db.ts
├── skip-reasons.db.ts
├── termination-reasons.db.ts
└── job-descriptions.db.ts
```

The orchestration layer in `lib/updates.ts` and `lib/deletes.ts` is being refactored to compose from these modules rather than executing SQL directly.

### CAR-32 — LLM-powered job market analysis

The planned market intelligence features will introduce a fourth layer: an analysis pipeline that consumes role data and produces structured market signals. This will likely introduce Pinia stores on the frontend (CAR-100) to manage shared state across analysis views, and a bulk ingestion pipeline on the backend for large-scale job posting data.
