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

## Avoid long chains off raw element locators

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
