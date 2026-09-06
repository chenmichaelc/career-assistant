# CLAUDE.md

Working agreement for how Claude should operate in this project, based on patterns from actual sessions — not generic best practice.

## Before writing code or tests

- Read `semantic-testing-rules.md` before writing or editing any file. It documents system architecture conventions that aren't testable via ESLint, Vitest, or Playwright.
- Read `ARCHITECTURE.md` for general architecture guidance on the implementation in this application, especially interactions between the app, library, and database.

## Test layer selection

This is a test-heavy project by design — five layers exist, each catching a distinct class of mistake. Putting a check at the wrong layer either misses what it should catch or duplicates what a cheaper layer already proves — both are real costs. `semantic-testing-rules.md` carries a short pointer back here plus anything specific to its own worked-incident style; this is the canonical version.

- **Lint (ESLint).** Goal: catch mechanical mistakes or code smells suggesting deeper architectural issues before the code runs — syntax shapes, banned patterns, import boundaries, naming. Scope: anything expressible as a pure AST pattern or naming rule that doesn't require understanding _why_ the code does what it does (layer-boundary imports, banned raw SQL outside `lib/db/`, function length as a rough complexity proxy). Trigger: you can write a selector that mechanically distinguishes the bad shape from the good one, with no false positives that need judgment to filter.
- **Semantic testing rules (`semantic-testing-rules.md`).** Goal: capture conventions that are real and enforceable by a careful reader (human or LLM) but can't be reduced to a mechanical pattern. Scope: judgment calls — is a fixture's divergence from a same-identity sibling intentional or drift, does a decomposition read as named steps. Trigger: the same violation has genuinely happened (once expensively, or more than once) and a written principle would have prevented it, but no ESLint selector can express the check without either missing real cases or flagging clearly-fine ones.
- **Unit tests (`tests/unit/`, `client/tests/unit/`).** Goal: verify one function or module's behavior in total isolation — no I/O, no browser, no other layer involved. Scope: two distinct things — (a) business logic with real branches worth enumerating (`cleanseUrl()`'s tracking-param stripping, `parseRecords()`'s format parsing), and (b) a framework-integration contract that's cheap to verify here and easy to silently break elsewhere (`useDiff.test.ts` verifying Vue's reactivity system tracks every ref a `computed` reads — not business logic, verifying the framework wiring behaves as the rest of the code assumes, invisibly to TypeScript). Trigger: ask whether the thing under test has a non-obvious contract that's genuinely isolable from rendering/HTTP/DB. If the "test" would just restate control flow already fully visible in the source — call A, then B, then C, in the order the code already visibly does — it isn't testing a contract, it's re-describing the implementation; skip it. (A composable test drafted for `TriageQueue.vue`'s `requestDelete()`/`queueStub()` was dropped for exactly this reason — it would have only asserted a mocked confirm/fetch sequence happened in the order the code already visibly executes it in, with nothing E2E doesn't already cover with more fidelity.)
- **Integration tests (`tests/integration/routes/`).** Goal: verify a real layer _boundary_ — HTTP in, real orchestration and a real SQLite database (`:memory:`, real constraints, no mocks) out. Scope: status codes, response shapes, multi-statement transaction behavior (does a failed promotion actually roll back) — things a unit test can't see (never goes through HTTP or a real DB) and E2E is overkill for (no browser needed to check a 404). Trigger: the property is specifically about the HTTP contract or real-database transactional behavior, not business logic in isolation and not what a user sees on screen.
- **E2E tests (`e2e/`).** Goal: verify a real user-visible workflow through a real browser — what an actual person does and sees, wired together across pages/components in ways no lower layer can observe. Scope: navigation, multi-component interaction, confirm-modal flows. Trigger: either the workflow only exists once multiple pieces are wired together, or it's the only layer where checking the property doesn't require faking enough of the surrounding system that the check stops meaning anything.

**The rule that spans all five:** before adding a check anywhere, ask whether a cheaper or more precise layer already proves it. A unit test duplicating E2E coverage of the same user-visible behavior adds maintenance cost without adding signal; an E2E test asserting something a unit test already pins down precisely just slows the suite for no new information. Coverage across layers should be complementary, never overlapping.

## Verification

- **Never present reasoning as verification.** "I traced the logic by hand, and it should work" is not the same claim as "I ran it and confirmed it works." Say which one is true. If only the former is true, say so explicitly, in the same message, not as a footnote.
- **Run tests, builds, lint, and typecheck live when running as Claude Code (or an equivalent local session with direct filesystem access) on every turn that implements a code change.** Explicit signal to look for: the session is identified as running through a local product surface (e.g. "the Claude desktop app's Code tab," a local CLI invocation) with direct access to this repo on disk.
- **Live verification should not occur when running as a remote/cloud-hosted session** — explicit signal: launched via a remote agent, `isolation: "remote"`, a scheduled cloud task, or other explicit cloud-session framing. In this case, in the output, recommend running the algorithmic checks on the updated codebase.
- **When genuinely uncertain which mode applies, or a live check isn't available, assume that you're on cloud.**
- If asked "is this sufficient?" after a green check, answer honestly about what that check does and doesn't prove. A passing lint run doesn't prove a new rule fires; it proves nothing currently in the repo trips it.

## When something is reported broken

- **Take a direct user report of a bug as the primary fact**, over your own re-derivation of whether the code "should" work. If those conflict, the user's observation wins until proven otherwise — don't keep re-litigating "but the logic looks right to me" once they've told you they tested it and it isn't.
- Ask for the exact evidence (error output, expected vs. actual) before diagnosing. Don't guess at a root cause and start fixing before you have it, especially when the first guess turns out to explain some but not all the failures.
- When you do find the root cause, distinguish clearly between "this confirms the user's report" and "this is a different, additional bug I found while looking." Don't let a real secondary bug (e.g. a test-cleanup bug) overshadow or get confused with the primary one the user actually reported.

## Decisions

- **Surface architectural tradeoffs explicitly and stop for input, rather than picking one and proceeding.** This applies especially when a "fix" for a narrow bug reveals a broader design question (e.g. is URL-param persistence even the right architecture for what the user wants) — don't paper over that by just picking the locally-obvious fix.
- When a decision was made for a stated reason (e.g. "use the UI for Arrange steps, temporarily, because the API fixture doesn't exist yet on this branch"), mark it clearly in the code/tests as temporary and tied to that reason — not silently, and not as if it were the permanent convention.
- If you catch yourself about to reverse a design decision the user already made deliberately (e.g. re-litigating why URL params were chosen), don't — bring new information to them and let them decide whether it changes the earlier call.

## Fixing vs. presenting fixes

- If a fix is wrong, say so plainly and explain what was wrong about the reasoning — not just silently produce a corrected version. "I was wrong to present that as a fix" is a better sentence than quietly moving on.
- Before extending a pattern (e.g. reusing a `files` glob, applying a rule to a new file), check whether it actually behaves the way you assume in this specific tool/config — flat config merge semantics, TypeScript's literal-type narrowing, etc. Reasoning through "this is probably fine" is not the same as knowing.
- When told to disable or defer something rather than keep debugging it live, don't leave it half-disabled or delete the work — comment it out, explain why, and file a ticket with the specific failed-verification evidence so someone else (or future-you) doesn't start from zero.

## Jira / ticket hygiene

- When work is abandoned, blocked, or reopened, update the ticket's actual status (not just its description) — a ticket marked Done that isn't Done is worse than no ticket.
- Tickets should carry enough standalone context (exact code snippets, what was tried, what's still unknown) that they're useful months later without the original conversation. Assume the reader has forgotten everything discussed here.
- Don't guess at ticket status transitions (In Progress vs. To Do vs. Backlog) when it's ambiguous — ask, or leave it alone and say why.

## Documentation audience

- **Don't assume Claude is the only, or even the primary, consumer of project documentation.** `ARCHITECTURE.md`, `semantic-testing-rules.md`, and similar files serve human contributors, future Claude sessions, and possibly other tools — not one exclusively. When rewriting a section to account for LLM-assisted workflows, don't silently drop the case where a human works on the codebase without an LLM in the loop.
- When editing documentation, ask: would this paragraph make sense to a human contributor who never uses Claude on this project? If the answer is no, that's a signal the framing has drifted toward serving Claude specifically rather than documenting the project.
- **Don't cite ticket numbers in `ARCHITECTURE.md` (or similar reference docs) for finished work.** A parenthetical `(CAR-219)` next to a settled design decision goes stale the moment anyone forgets or can't look it up — the doc should describe the system as it is, not how it got there. Exception: work still in progress, where the ticket is the live source of truth and the doc should say so explicitly (e.g. "pending CAR-104").

## Test fixtures & synthetic data

- **Personal data duplicates itself.** Once a real name, email, or work history has been pasted into one fixture for a demo, it tends to get hand-copied (with small drift) into whatever other test file needs similar-shaped data. When scrubbing PII, grep the whole repo for the specific strings involved — don't assume the problem is contained to the one file that was flagged.
- **Use ranges reserved for exactly this purpose**, not an invented-sounding value that might collide with something real: the `.example` TLD (IANA-reserved, guaranteed non-resolving) for email addresses, Ofcom's `020 7946` range for UK fictional phone numbers, NANPA's `555-01XX` range for US ones.
- **A fixture "marker" string searched against serialized output (XML, HTML, JSON) may not appear verbatim there.** `parseResumeText.test.ts` asserts against a parsed JS string, where `&` is just a character — but `buildResumeDocx.test.ts` asserts against real generated OOXML, where the serializer escapes `&` to `&amp;`. The same literal that's safe as test data in one file can silently fail as a search marker in the other. Check which kind of assertion you're writing before reusing a value across both.
- **Prefer one canonical fixture over hand-duplicated copies of the same synthetic dataset** across multiple test files, so the next edit — or the next PII scrub — touches one place instead of drifting across several independently.
- **A test dependency is either universal or scoped to a named test/test set — never ambiguously in between.** Which one it should be follows from what it represents, not a case-by-case call: structure (page objects, pure helper functions, fixture factories) generalizes and should be reusable anywhere; state (a fixture's actual content — one resume's specific dates, bullets, formatting) doesn't generalize by nature, and its correct scope is exactly the tests that need that scenario. Fixtures claiming the same synthetic identity across files must match exactly or diverge for a reason stated in the fixture itself — an unstated divergence reads as drift, not intent, and is a real bug class this repo has already hit once (see `semantic-testing-rules.md`). Full rationale in `ARCHITECTURE.md`'s "Test dependency scope: structure vs. state."

## Code comments

- Comments point at what isn't obvious from the code itself — a non-obvious constraint, a workaround, a subtle invariant. They are not a place to restate what the code does or narrate the ticket/investigation that produced it.
- Keep them short. A multi-line block explaining full context (spec references, verification history, rationale) belongs in the PR description or the ticket, not the file — it goes stale in the file and nobody maintains it there.

## General

- If a stated cost/effort estimate turns out to be wrong once real constraints surface (e.g. "this is the easy option" turns out not to be), say so directly when it becomes clear, rather than continuing to build on the original premise.
- Prefer catching your own mistakes mid-task and narrating the correction over shipping the first plausible-looking answer.
- **After running an experimental build/verification command, check the whole repo for stray output, not just the directory you ran it in.** A command can emit files anywhere its dependency graph reaches — `client/`'s `tsc --build` experiment left a compiled `lib/url-cleanse.js` behind (a cross-directory import target), which escaped a cleanup pass scoped only to `client/`. `git status` at the repo root, not a scoped directory listing, is what actually catches this.
