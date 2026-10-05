# Job stub parse contract

This document is the single source of truth for the JSON shape consumed by
`importParsedFields()` (`lib/job-stubs.ts`), which parses a job stub's manually-pasted,
LLM-generated structured output into that stub's `parsed_*` columns.

**Primary audience: an LLM (or human) generating this JSON from a job posting's raw
text.** These are hard rules the importer enforces via runtime schema validation
(Zod) — not a style guide, not a suggestion. Unlike the resume text-import format
(`resume-import-format.md`), a violation here does not silently drop data: the entire
import is rejected with a field-level error and none of the stub's `parsed_*` columns
are written. See "Failure mode" under each field for the exact rejection behavior.

Every field is optional. A posting may not mention salary, or a location, or give any
signal on remote/hybrid/onsite — omit a field entirely (or send `null`) rather than
guessing a value. There is no required minimum set of fields; an empty object `{}` is
valid input and simply leaves every `parsed_*` column unchanged... other than
advancing the stub's `status` to `'Parsed'` (see "What happens on success" at the end).

## Fixture

`tests/fixtures/jobStubParseContract.fixture.ts` exercises every field in this
document, including one invalid enum value (to exercise the rejection path) and
multi-entry `skip_reasons`/`termination_reasons` arrays. It is checked against the real
`importParsedFields()` function by `tests/unit/job-stub-parse-contract.test.ts`. If you
change a rule here, update that fixture and its test in the same change.

---

## 1. `company`

**Type:** string, nullable/optional.

The company name as it appears in the posting. Free text, no normalization applied.

**Failure mode:** not a string → the whole import is rejected with a field-level error
naming `company`.

## 2. `title`

**Type:** string, nullable/optional.

The job title as it appears in the posting.

**Failure mode:** not a string → rejected, same as `company`.

## 3. `description`

**Type:** string, nullable/optional.

The job description body. Maps onto the same field a manually-added `roles` entry
calls `jd`, but is named `description` here to match the posting's own vocabulary —
this JSON contract does not need to match `RoleInput`'s field names one-for-one.

**Failure mode:** not a string → rejected.

## 4. `salary_min` / `salary_max`

**Type:** integer, non-negative, nullable/optional. Independent fields — a posting
with only one bound (e.g. "$150k+") should send just that one and omit the other.

**Failure mode:** not an integer, or negative → rejected, naming the specific field
(`salary_min` or `salary_max`).

## 5. `candidacy`

**Type:** string, nullable/optional. Must be one of the same four values `roles.candidacy`
accepts: `Slam Dunk`, `Competitive`, `Reach`, `Skip`.

This is a judgment call about fit, not something literally stated in a posting — only
include it if the LLM was explicitly prompted to make that assessment (e.g. against a
resume it was also given). Omit rather than guess.

**Failure mode:** any value outside the four listed → rejected, naming `candidacy` and
listing the valid values.

## 6. `role_status`

**Type:** string, nullable/optional. Must be one of the eleven values `roles.role_status`
accepts (`Resume Needed`, `Resume Ready`, `Applied`, `Callback`, `In Interview`,
`Offer Accepted`, `Offer Declined`, `Skipped`, `Closed`, `On Hold`, `Pending Triage`).

Exists for the historical-recordkeeping case: a stub logged after the fact for a
posting that's already known to be stale or no longer being pursued. Most imports
should omit this and let the stub start life via the normal manual workflow instead.

**Failure mode:** any value outside the eleven listed → rejected, naming `role_status`
and listing the valid values.

## 7. `skip_reasons`

**Type:** array of `{reason, note}`, nullable/optional. `reason` must be one of the
eleven values `skip_reasons.reason` accepts elsewhere in this app (see
`VALID_SKIP_REASONS` in `lib/types.ts`); `note` is a free-text string, nullable/optional.
An array, not a single object, since a posting can be disqualified for more than one
reason at once.

Only meaningful alongside `role_status: "Skipped"`. This import step does not enforce
that pairing; it is enforced when the stub is promoted (see below), where `addRole()`
requires at least one skip reason for a `Skipped` role.

**Failure mode:** any entry's `reason` outside the valid list → rejected, naming the
specific array index (e.g. `skip_reasons.0.reason`) and listing the valid values.

## 8. `termination_reasons`

**Type:** array of `{reason, note}`, nullable/optional. `reason` must be one of the
thirteen values `termination_reasons.reason` accepts elsewhere in this app (see
`VALID_TERMINATION_REASONS` in `lib/types.ts`); `note` is free-text, nullable/optional.

Only meaningful alongside `role_status: "Closed"`, for the same historical-recordkeeping
reason as `skip_reasons` above.

**Failure mode:** any entry's `reason` outside the valid list → rejected, naming the
specific array index and listing the valid values.

## 9. `location`

**Type:** string, nullable/optional. Purely geographic (e.g. `"Austin, TX"`) — never a
remote/hybrid/onsite signal; see `in_office_expectation` below for that axis.

**Failure mode:** not a string → rejected.

## 10. `in_office_expectation`

**Type:** string, nullable/optional. Must be one of exactly four values: `Remote`,
`Hybrid`, `In-Office`, `Unknown`.

Owns the remote/hybrid/onsite axis exclusively — a fully-remote posting with no city
mentioned should send `in_office_expectation: "Remote"` and omit `location` entirely,
not put `"Remote"` into `location`.

**Failure mode:** any value outside the four listed → rejected, naming
`in_office_expectation` and listing the valid values.

---

## What happens on success

All eleven `parsed_*` columns are written together, in one transaction, replacing
whatever was there before — a partial re-import fully overwrites the prior parsed
state rather than merging into it. The stub's `status` advances to `'Parsed'`
regardless of which fields were actually present in the input (even `{}` advances the
status — the act of running an import is itself the signal, not any particular field
being populated).

## What happens on failure

Nothing is written. Zero columns change, `status` does not advance. The response lists
every field that failed validation, not just the first one — fix all of them and
resubmit rather than iterating field-by-field.

## Explicitly out of scope for this contract

- **Promoting a stub into a full `roles` entry.** This document only covers writing
  into `job_stubs.parsed_*`. Promotion is a separate, human-reviewed step: "promote" on
  the Triage list opens Add Role (`/add?stubId=<id>`) prefilled from the stub's parsed
  fields, including candidacy and skip/termination reasons. The person reviews, edits,
  and submits the normal role form, so `addRole()` is the only validator, and creating
  the role deletes the stub. `raw_content` is not carried over; it is discarded with
  the stub.
- **Bulk/multi-stub import.** This is a single-stub operation — one JSON payload, one
  `job_stub.id`. Confirmed explicitly out of scope for this ticket (CAR-287).
