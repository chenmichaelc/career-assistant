# Resume text-import format contract

This document is the single source of truth for the plain-text format consumed by
`client/src/utils/parseResumeText.ts` and rendered by `client/src/utils/buildResumeDocx.ts`.

**Primary audience: an LLM (or human) generating input for the Resume Converter.**
These are hard rules the parser enforces mechanically today — not a style guide, not a
suggestion. The parser has no error path: a line that doesn't match a rule below is
either misattributed or silently dropped. See "Failure mode" at the end of each rule
for what actually happens when it's violated.

## Fixtures

There are three resume fixtures in `client/tests/fixtures/`, each testing a different
boundary. They intentionally overlap in content — that's not duplication, each one
exists to isolate a different layer:

| Fixture                           | Tests                          | Exercises                                                                      |
| --------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `parseResumeText.fixture.ts`      | `parseResumeText.test.ts`      | `parseResumeText()` only                                                       |
| `buildResumeDocx.fixture.ts`      | `buildResumeDocx.test.ts`      | `buildResumeDocx()` only, on a hand-built object that never touched the parser |
| `resumeFormatContract.fixture.ts` | `resumeFormatContract.test.ts` | Both, end to end — this doc's companion fixture                                |

`resumeFormatContract.fixture.ts` is the one that satisfies every rule in this document, and is
checked against `parseResumeText()` + `buildResumeDocx()` together by
`resumeFormatContract.test.ts`. If you change a rule here, update that fixture and its
test in the same change — they are required to stay in sync with each other and with
this doc.

The parse-only and render-only fixtures are deliberately kept separate from the
full-pipeline one: it means a parser regression only fails parse-side tests, and a
renderer regression only fails render-side tests, so a test failure tells you which
layer broke without further digging. Don't merge them into one shared fixture — see
this repo's ARCHITECTURE.md on layer isolation for why that boundary matters
elsewhere in the codebase too.

---

## 1. Header block

- **Line 1**: full name, and nothing else.
- **Line 2**: the single contact line, and nothing else.
- Nothing may precede `SUMMARY` other than these two lines and blank lines.

**Failure mode**: the parser reads line 1 and line 2 unconditionally, no validation —
garbage in either line renders as-is.

## 2. Section headers

Exactly five recognized headers, each **UPPERCASE, alone on its own line**, no
punctuation, no leading bullet:

```
SUMMARY
EXPERIENCE
PROJECTS
EDUCATION
SKILLS
```

**Failure mode**: any other spelling, casing, or a header with trailing text
(`EXPERIENCE:`, `Experience`, `WORK EXPERIENCE`) is not recognized as a header. It is
instead treated as ordinary content of whatever section is currently open — or, if no
section is open yet, silently ignored.

## 3. The two dash characters — the most common failure

Two _visually similar but distinct_ dash characters are load-bearing, and they are
**not interchangeable**:

| Character   | Unicode | Used for                       | Sections                        |
| ----------- | ------- | ------------------------------ | ------------------------------- |
| En dash `–` | U+2013  | Date range separator           | Experience, Projects, Education |
| Em dash `—` | U+2014  | Degree / institution separator | Education only                  |

**Never** use a plain hyphen-minus `-` (U+002D) or em dash `—` in a date range.
**Never** use an en dash in the Education degree/institution separator.

Correct:

```
08/1877 – Present
1876 – Present
Doctor of Medicine — University of London	1877 – 1878
```

Incorrect (hyphen instead of en dash — this is the exact bug that motivated this doc):

```
08/1877 - Present
1876 - Present
```

**Failure mode**: the entry-detection regex matches only the en-dash date-range shape.
A line using a plain hyphen never matches, so it's never recognized as an entry line.
Everything that would have attached to that entry — the title line, every bullet under
it — falls through with nowhere to attach and is **silently dropped**. The section
appears empty in the parsed output with no error.

Text-editing autocorrect is the most common source of this bug: dates typed by hand
often stay as plain hyphens while prose elsewhere gets autocorrected to en/em dashes,
producing an inconsistent document a human proofreader won't visually catch.

## 4. Entry-line shape (Experience, Projects, Education)

A line is recognized as a new entry if and only if it **ends** in a date range shaped
like `(M)M/YYYY` or `YYYY`, an en dash, then another `(M)M/YYYY`/`YYYY` or the literal
word `Present`:

```
<label>  <whitespace>  <date range>
```

- The whitespace between label and date range can be a tab or two-or-more spaces —
  either works. A **single space does not** (see rule 5).
- This is shape-based detection, not header-based — _any_ line ending in a valid date
  range, inside Experience/Projects/Education, is treated as a new entry, even if
  that's not what was intended. Don't let a bullet or summary sentence accidentally
  end in something matching this shape.

**Failure mode**: a line that doesn't match this shape is not an entry line. Depending
on section, it's evaluated as a title, bullet, or summary line instead (see below) — or
dropped if none of those apply.

## 5. Experience section

```
Company Name  Location	MM/YYYY – MM/YYYY
Job Title
•	Bullet text
•	Bullet text
```

- **Entry line**: company and location must be separated by **two or more spaces or a
  tab** — a single space will not split them, and the whole string becomes the company
  name with an empty location.
- **Title line**: the line immediately after the entry line, and only that line, is
  captured as the job title.
- **Bullets**: every subsequent line must start with `•` or `-` (after trimming
  leading whitespace) to be captured.
- Any line under a job that is not a bullet — a stray sentence, a second title line —
  is **silently dropped**, not appended anywhere.

## 6. Projects section

```
Project Name (link)	MM/YYYY – MM/YYYY
Optional one- or multi-line summary sentence. Joined with spaces if multi-line.
•	Bullet text
```

- **Entry line**: same date-range rule as Experience. An optional link goes in
  parentheses at the end of the label: `Project Name (github.com/user/repo)`. Without
  parentheses, the whole label is the project name and `link` is `null`.
- **Summary line(s)**: any non-bullet line(s) appearing **before the first bullet** are
  captured as the project summary, joined with a single space if there are several.
- **Once a bullet line appears**, the summary-collection window closes for that
  project. Any further non-bullet line is silently dropped, not appended to the
  summary and not treated as a new summary.
- A project need not have a summary — bullets may start immediately after the entry
  line.

## 7. Education section

```
Degree — Institution	MM/YYYY – MM/YYYY
```

- One line per entry. No title line, no bullets, no summary — anything past the entry
  line for that degree is not education content.
- Degree and institution are split on the **em dash** `—`, not the en dash used for the
  date range on the same line.

**Failure mode**: if the em dash is missing or is actually an en dash, the split
produces an empty institution (or vice versa) rather than an error.

## 8. Skills section

```
Category Name: item, item, item
```

- One category per line. Everything before the first `:` is the category name;
  everything after, comma-split and trimmed, is the item list.
- **A line with no colon is silently dropped entirely** — not treated as a
  continuation of the previous line, not an error.

## 9. Summary section

Free text. All consecutive non-blank lines are joined with single spaces into one
paragraph. No internal structure is parsed.

## 10. General

- Plain UTF-8 text only. No markdown syntax (`**bold**`, `_italic_`, `## heading`,
  backticks) — none of it is stripped or interpreted; it renders literally in the
  output document.
- Blank lines are cosmetic only. The parser detects section and entry boundaries by
  line _shape_, not by blank-line spacing, so blank lines between entries can be
  added or omitted freely without affecting parsing.
- Every non-blank line under a recognized section must match one of that section's
  recognized shapes (entry line, title, bullet, summary-in-progress, skill line).
  **A line that matches none of them is dropped with no warning.** When generating
  this format, verify every line against these rules rather than assuming
  "looks right" is sufficient — the parser gives no feedback when it disagrees.

## Self-check before returning generated output

1. Every date range uses `–` (U+2013), never `-` or `—`.
2. Every Education line's degree/institution separator uses `—` (U+2014), never `–`.
3. Every Experience/Project/Education entry line has 2+ spaces or a tab between the
   label and the date range.
4. No freeform prose appears in Experience after bullets have started, or before the
   title line.
5. No freeform prose appears in Projects after bullets have started.
6. Every Skills line contains exactly one `:` separating category from items.
7. Section headers are exactly `SUMMARY` / `EXPERIENCE` / `PROJECTS` / `EDUCATION` /
   `SKILLS`, uppercase, alone on their line.
