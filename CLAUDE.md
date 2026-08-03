# CLAUDE.md

Working agreement for how Claude should operate in this project, based on patterns from actual sessions — not generic best practice.

## Verification

- **Never present reasoning as verification.** "I traced the logic by hand and it should work" is not the same claim as "I ran it and confirmed it works." Say which one is true. If only the former is true, say so explicitly, in the same message, not as a footnote.
- **Don't run tests, builds, or ESLint live in this environment** to check work. It costs real usage against the account and isn't worth it for verification that a human can do in seconds locally. Instead: propose the exact command to run, or a minimal scratch file that isolates the thing being checked, and wait for the result before proceeding on top of it.
- **When a live check isn't available, say what specifically is unverified** — not just "this should work," but "X and Y are confirmed by reasoning, Z is the part I can't verify without running it."
- If asked "is this sufficient?" after a green check, answer honestly about what that check does and doesn't prove. A passing lint run doesn't prove a new rule fires; it proves nothing currently in the repo trips it.

## When something is reported broken

- **Take a direct user report of a bug as the primary fact**, over your own re-derivation of whether the code "should" work. If those conflict, the user's observation wins until proven otherwise — don't keep re-litigating "but the logic looks right to me" once they've told you they tested it and it isn't.
- Ask for the exact evidence (error output, expected vs. actual) before diagnosing. Don't guess at a root cause and start fixing before you have it, especially when the first guess turns out to explain some but not all of the failures.
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

## Code comments

- Comments point at what isn't obvious from the code itself — a non-obvious constraint, a workaround, a subtle invariant. They are not a place to restate what the code does or narrate the ticket/investigation that produced it.
- Keep them short. A multi-line block explaining full context (spec references, verification history, rationale) belongs in the PR description or the ticket, not the file — it goes stale in the file and nobody maintains it there.

## General

- If a stated cost/effort estimate turns out to be wrong once real constraints surface (e.g. "this is the easy option" turns out not to be), say so directly when it becomes clear, rather than continuing to build on the original premise.
- Prefer catching your own mistakes mid-task and narrating the correction over shipping the first plausible-looking answer.
