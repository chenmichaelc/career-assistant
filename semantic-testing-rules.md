# Semantic Testing Rules

Conventions that are meaningful but not automatable via ESLint (CAR-193, CAR-200). These require judgment to apply — read the code, don't just pattern-match. Complements the ESLint config: that handles what's mechanical, this handles what isn't.

---

## Test step naming

`test.step()` descriptions must start with `Arrange:`, `Act:`, or `Assert:`.

```typescript
await test.step('Arrange: Create a role in Pending Triage status', async () => { ... });
```

Makes test intent readable in CI failure output, where only the step name shows. Also enforced by ESLint (`e2e/**/*.ts`) — documented here for the rationale, since the lint rule only reports the violation.

---

## Test variable naming

Name variables by what the request _does_, not what it _is_: `roleCreationResponse`, not `response`.

A failing `expect(response.statusCode).toBe(201)` tells you nothing; a failing `expect(roleCreationResponse.statusCode).toBe(201)` tells you which operation failed without reading surrounding code.

Note: `tests/integration/routes/roles.test.ts` drifts from this (`fetchedRole` after `roleCreationResponse`) — worth a tightening pass, not urgent.

---

## Page object locator scoping

Scope locators to a zone container before targeting elements within it. A bare `page.getByRole(...)` is only safe if the element is unique on the page.

```typescript
// Good
const addSkipReasonSection = page.getByTestId('add-skip-reason-section');
this.addSkipReasonSelect = addSkipReasonSection.locator('select');

// Bad — scopes to the wrong (sibling) zone; never matches, looks like a flaky timeout
this.addSkipReasonSelect = this.skipReasonsSection.locator('select');
```

Prevents cross-zone false matches as the page grows, and prevents silent mismatches like the one above.

---

## Test dependency scope: structure vs. state

A shared test dependency should be universal (usable by any test, no scope
restriction) or scoped to a named test or set of tests — never in between, where its
actual scope has to be reverse-engineered by reading every consumer.

Which one it should be isn't a judgment call made fixture-by-fixture — it follows
directly from what the dependency represents:

- **Structure generalizes.** A page object encodes how to interact with a page —
  locators, structural affordances — which is true regardless of which test is
  running or what data happens to be loaded. A pure helper function (e.g.
  `extractParagraph(xml, marker)` in `buildResumeDocx.test.ts`) is the same: it
  operates on whatever it's handed and holds no scenario of its own. Both are
  correctly universal, and should stay that way — never give a page object or a
  helper function embedded data specific to one test's scenario.
- **State doesn't generalize.** A fixture encodes a specific instantiated scenario —
  this resume, with these dates, in this format. Two fixtures with different content
  are, by definition, testing different things; there's no way to make one "more
  universal" without diluting the specific state it exists to represent. A fixture's
  correct scope is exactly the set of tests that need that particular state — nothing
  broader.
- **A fixture _factory_** (something parameterized that generates a fixture on
  demand, e.g. `buildResume({ overrides })`) is structure, not state, and belongs in
  the universal bucket even though it produces fixtures — the factory is a mechanism;
  each thing it produces is still scoped state. Don't mistake "this generates state"
  for "this is exempt from the rule below."

This mirrors the same schema-vs-data split this codebase already applies elsewhere —
see "Vocabulary types and runtime arrays" in `ARCHITECTURE.md`: the type is
structural and universal, a given value assigned to it is an instance.

### Fixture divergence must be traceable to a stated requirement

Because fixtures are state, not structure, having several of them for the same
general subject isn't automatically duplication — but when two fixtures represent
"the same" synthetic entity — same name, same claimed identity — their data must
either match exactly or diverge for a reason written down in the fixture itself. An
unstated divergence is indistinguishable from an accident, and a reader has no way to
tell which one they're looking at without diffing every field by hand.

This is a real bug, found in this codebase, not a hypothetical:

```typescript
// parseResumeText.fixture.ts — John H. Watson, Kensington, London, 1891–1894
'Private Medical Practice  Kensington, London\t1891 – 1894'
// bullets: purchased and operated an independent practice, stable patient roster

// buildResumeDocx.fixture.ts — also "John H. Watson," same role, same dates
location: 'Kensington, London (Remote)',
    bullets: ['Maintained a patient roster.'],
```

Same claimed person, same job, same dates — one fixture has him running an
independent practice, the other has him working remotely, with entirely different
bullet content. Neither test file's assertions depend on the specific divergent
details (checked: no test targets `'(Remote)'` or `'patient roster'` as a marker) —
which means this isn't an intentional edge case, it's unreviewed copy-drift that
happened to survive because nothing made it visible. It was carried forward silently
across at least one prior refactor before being noticed.

**Before creating a fixture that reuses a name/identity from an existing one:**

1. Default to reusing the existing dataset exactly, or a documented literal subset of
   it — not a re-typed, "close enough" version.
2. If the fixture's purpose genuinely requires different data (a shape the source
   fixture doesn't have, an edge case it can't represent), state that requirement in
   a comment at the point of divergence — not just in the file header, at the specific
   field that diverges — so the next reader can tell "this is intentional, here's why"
   from "this drifted."
3. If no such requirement exists, the fixture should derive from the source rather
   than duplicate it (e.g. a hand-built object fixture that must stay decoupled from a
   live parser call can still be a frozen, verified-identical copy of what the parser
   currently produces from the canonical text — decoupled at freeze-time, not diverged
   at write-time).

**Fixture representation format should match what the feature actually consumes, not
just match sibling fixtures for uniformity.** A fixture whose job is verifying exact
literal-character formatting (e.g. dash-character or whitespace bugs) is more
trustworthy as a plain file you can diff or hexdump directly than as an in-language
string literal, which adds an escaping/parsing layer between what's on disk and what
the test receives — even if every other fixture nearby happens to use that language's
native literal syntax. Don't let "the other two files do it this way" override "this
fixture's own purpose calls for something else."

---

Don't chain more than two calls off a raw locator like `locator('div')`. Scope to `getByTestId()` or `getByRole()` first.

Deep chains off naked selectors break on any unrelated DOM change. ESLint catches positional selectors (`.nth()`) but not chain depth or quality — that's a judgment call.

---

## `data-testid` placement

`data-testid` goes on zone containers (modals, card sections, page regions) — never on individual interactive elements. Those are located by role + name within their scoped container.

`data-testid` on a button or input is a sign it lacks a proper accessible name; fix the name, don't bolt on a testid.

---

## Repeated `data-testid` on non-interactive rows is a different case

The rule above is about controls — buttons, inputs, links — which almost always have an available accessible name, so "never" is the right bar there. It doesn't cover non-interactive, repeated content rows with no control semantics and nothing to hang a name on: `DiffVisualizer.vue`'s rendered diff lines (`data-testid="diff-line-added"` etc.) are plain `<div>`s classifying rendered content, not controls a user acts on.

For that case, the same testid repeated across every matching row, queried with `getByTestId(...).nth()` or `.toHaveText([...])` for the array, is the accepted pattern — there's no accessible-name fix available because there's no control to name.

Don't read this as license to reach for a testid whenever naming a button feels inconvenient — that's still the violation the rule above exists to prevent. The distinction is control vs. non-interactive content row, not "couldn't think of a better way."

---

## Page Object definition block mirrors constructor block

Class property declarations must match the order and grouping of their constructor initializations, with matching section comments.

Violated once in `roleDetailPage.ts` during CAR-198, caught only because the diff was reviewed manually — nothing else would have caught it. Mismatched ordering makes it hard to verify every declared property is initialized.

---

## Page Object intermediate locators are class properties, not constructor locals

A locator that exists only to scope child locators must still be a `readonly` class property, not a `const` in the constructor.

```typescript
// Good
readonly addSkipReasonSection: Locator;
// ...
this.addSkipReasonSection = page.getByTestId('add-skip-reason-section');

// Bad — invisible outside the constructor; can't be asserted on later
const addSkipReasonSection = page.getByTestId('add-skip-reason-section');
```

ESLint enforces `readonly` on properties that exist, but can't tell a `const` _should have been_ one — that's the semantic gap this rule covers.

---

## `[E2E]` prefix and `TEST_COMPANIES` sync

All fixture company names use `[E2E]`; `TEST_COMPANIES` must list every one in use, or the admin cleanup endpoint won't catch it.

Prefix enforcement is lint-enforced (CAR-200, `e2e/fixtures/**`). The sync check isn't — it requires cross-referencing two structures, not worth a custom rule at one fixture file. A comment reminder in `roles.ts` is the current mitigation.

---

## Arrange via API, not UI — except when the UI is the subject

Set up test state via direct API calls (`roleHelper.createRole()`), not by driving the UI. Exception: when the UI flow _is_ what's being tested (e.g. `addRole.spec.ts`). Teardown always uses the API, no exception.

UI-based setup couples unrelated tests to the setup page's correctness — a broken add form shouldn't fail every `RoleDetail` test. `addRole.spec.ts` already covers the add flow; repeating it as incidental setup adds time, not signal.

---

## Arrange via the domain's own functions, not another router's HTTP surface

The integration-test-layer version of the rule above. When a test needs data belonging to a domain other than the one under test — `tests/integration/routes/job-stubs.test.ts` needing a pre-existing role to test dedup against — call that domain's own orchestration function directly (`addRole()`), not raw SQL, and not registering its whole router to hit it over `app.inject`.

```typescript
// Bad — pulls in rolesRouter's entire route/validation surface as an
// incidental dependency of a job-stubs test
await app.register(rolesRouter, { prefix: '/api/roles', db: sqlite });
await app.inject({
  method: 'POST',
  url: '/api/roles',
  payload: { ...role, role_status: 'Applied' },
});

// Good — same real validation, no second router
addRole(sqlite, { ...role, role_status: 'Applied' });
```

Two separate reasons, not one:

- **Raw SQL bypasses real validation and can mask a broken test.** This happened: a setup fixture used `role_status: 'Applied'` without `applied_date`, invisible while inserted via raw SQL, silently wrong for months. Switching to `addRole()` surfaced it immediately with a clear error, because it's the same validation the real feature runs.
- **A second router is not "using real code," it's importing an unrelated subsystem's entire surface.** `roles.ts` can grow a new contextual validation rule next year for reasons that have nothing to do with job stubs, and this file breaks anyway — coupling that provides no signal about what it's actually supposed to protect. Full HTTP through multiple routers is for genuine cross-system journey tests, not incidental arrangement — `job-stubs.test.ts` isn't that.

Before citing an existing integration test file as precedent for this kind of call, check whether its situation actually matches structurally — does it use HTTP for setup because the setup data _is_ what's under test (`query.test.ts` running `INSERT`/`SELECT` through the SQL Query tool — that's the feature), or is it just the most recent similar-looking file? `roles.test.ts` uses `app.inject` exclusively because it's testing roles against itself — that doesn't transfer to a different router needing roles data as a precondition.

---

## Name a test after what it protects, not the incidental mechanism that triggers it

A test's name and framing should describe the property actually being verified, not whatever input happened to be convenient for forcing the failure path.

```typescript
// Bad — reads as if empty titles are the interesting case
test('invalid role data returns 400, and the stub is NOT deleted (atomicity, over HTTP)', ...)

// Good — names the actual guarantee; a comment states the trigger is incidental
test('a failed promotion leaves the stub intact (rollback, over HTTP)', ...)
```

`promoteStub()`'s atomicity — a failed promotion must never leave the stub deleted with no role created, or the reverse — is what's being protected. An empty `title` is only the deterministic way to force `addRole()` to fail inside that transaction; any validation failure would exercise the same rollback path. Naming the test around "invalid role data" misleads a future reader into thinking title validation is the point, when the transaction boundary is.

---

## Don't assert on implementation details

Assert on what the user sees — badge text, visibility, URL, message content — not Vue reactive state, CSS classes, or form-reset behavior.

```typescript
// Bad — tests that the form reset, not that the feature worked
await expect(roleDetailPage.addSkipReasonSelect).toHaveValue('');
```

These assertions pass when the feature is broken in user-visible ways, and fail when implementation changes in ways no user would notice.

---

## SQL formatting in template literals

Keywords uppercased, clauses on separate lines. Prettier doesn't parse inline SQL, so this isn't auto-fixed. `lib/db/roles.db.ts` does this correctly today.

---

## Layer boundary intent

Import-level ESLint rules catch specific named violations; they can't catch every direction a boundary gets crossed.

Live example: `server/routes/admin.ts` imports `TEST_COMPANIES` from `e2e/fixtures/roles.ts` — production code depending on test fixtures. No configured rule restricts imports _from_ `e2e/`, so this passes lint cleanly while still being a real violation (CAR-195). Read actual imports and ask if the dependency makes sense — don't rely on the lint rule having anticipated it.

---

## Test coverage layer assignment

Pure functions → unit tests. HTTP contract and status codes → integration tests. User-visible workflows → E2E. Each layer tests what only it can test; don't duplicate coverage across layers — it adds maintenance cost without adding signal.

---

## Cast-based type narrowing is a defect, not a style choice

`X.includes(value as T)` looks like a type-check but isn't one — the cast forces the compiler to accept an unverified value, so the "check" that follows is checking nothing.

```typescript
// Bad — the cast silences the compiler, not the bug
if (!VALID_STATUSES.includes(input.status.trim() as RoleStatus)) { ... }

// Good — Set + named type guard, no cast
const VALID_STATUS_SET = new Set<string>(VALID_STATUSES);
export function isRoleStatus(value: string): value is RoleStatus {
    return VALID_STATUS_SET.has(value);
}
```

The guard's parameter type should match the value's real type at the call site — usually `string`, not `string | undefined`. Handle optionality at the call site (`format != null && isExportFormat(format)`), not by widening the guard; a guard checking two different things (is it present, is it valid) is doing two jobs.

**Fixed on this branch as part of the same work that added this rule** (CAR-208): `lib/updates.ts` (three instances — `input.status`, skip reasons, termination reasons) and `server/routes/roles.ts` (four instances — sort key, skip reasons, termination reasons, export format). ESLint can catch the mechanical shape of this (see CAR-207 for a drafted-but-unverified rule), but can't judge whether a given cast is actually safe — that's why this is documented here too, independent of whether the lint rule ships.

---

## Not all `as` casts are the same risk

A cast asserting the shape of trusted, self-authored data (`sqlite.prepare(...).all() as RoleRow[]` in `lib/db/*.ts`) is a different category from a cast bypassing a validation check against untrusted external input (the pattern above). Both are casts; only one is a defect.

Don't flatten every `as` in an audit into one bucket — check what's on the other side of the cast. Self-authored query results with no external data flowing through are a known, accepted, low-priority risk; a cast validating a URL query param or request body is not.

---

## Semantic naming applies everywhere — variables, parameters, functions, everything

A name should say what the thing is or does, not what shape it has (`raw`, `valid`, `list`) or how briefly it can be typed (`s`, `fmt`, `jd`, `run`). This applies uniformly — top-level declarations, function parameters, callback and loop parameters, short-lived locals, class properties. There's no tier of the codebase where an unclear name becomes acceptable because the scope is small or the lifetime is short; a name that takes a moment to decode costs that moment every time it's read, regardless of where it lives.

```typescript
// Bad — callback parameter
VALID_STATUSES.filter((s) => !INACTIVE_STATUSES.includes(s));

// Good
VALID_STATUSES.filter((status) => !INACTIVE_STATUSES.includes(status));
```

```typescript
// Bad — function name and parameter both describe shape, not purpose
function run(db: Database.Database, id: number) { ... }

// Good
function updateRoleStatus(db: Database.Database, roleId: number) { ... }
```

```typescript
// Bad — local variable named for its type, not its role
const raw = response.json();
const valid = raw.filter((r) => r.status === 'active');

// Good
const parsedRoles = response.json();
const activeRoles = parsedRoles.filter((role) => role.status === 'active');
```

---

At current scale (~6,000 lines, one cohesive module), a single document is right. As the project splits into genuine subsystems, subsystem-specific conventions should move to docs co-located with them — the same way ESLint rules are already scoped by glob. The right unit of modularization is the subsystem boundary, not line count.

## Audit cadence

Read this: at the start of a session with significant new code, before closing a major epic, and when back-applying a new convention to existing code.

## Related

Complements CAR-193 and CAR-200 (ESLint) — those automate what's mechanical; this covers what requires judgment.
