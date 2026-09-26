# Jira update conventions

How to create and edit Jira tickets on this project so they actually render correctly, based on a real formatting failure found and diagnosed on 2026-09-27. Read this before any `createJiraIssue`/`editJiraIssue` call that includes more than a single plain sentence of description.

## The bug, confirmed

`createJiraIssue` with `contentFormat: "markdown"` silently corrupts descriptions containing more than trivial text: newlines come out as literal `\n` characters instead of line breaks, headers (`## `) render as plain text, code fences don't become code blocks, and tables don't become tables. The tool call itself reports success — nothing about the response indicates the content was mangled.

This was confirmed by comparing tickets created this session:

- **Broken** (created via `createJiraIssue` with `contentFormat: "markdown"`, never subsequently edited): CAR-268, CAR-269, CAR-270, CAR-271, CAR-272, CAR-280. All had literal `\n` text and unrendered markdown syntax when read back.
- **Clean**: tickets created the same way but _later_ edited via `editJiraIssue` with `contentFormat: "markdown"` (CAR-265, CAR-266, CAR-267) — the edit overwrote the corrupted content with correctly-rendered text. Tickets created outside this session's tool-call pattern (CAR-178, CAR-263, CAR-264) were also clean.

Root cause isn't fully understood (likely a double-escaping bug specific to `createJiraIssue`'s markdown path), but the empirical boundary is clear enough to act on.

## What's confirmed to work

- `editJiraIssue` with `contentFormat: "markdown"` correctly renders: headings (`##`), **bold**, `inline code`, fenced code blocks (` ```typescript `), bullet and numbered lists. Confirmed across six real ticket fixes (CAR-268 through CAR-272, CAR-266).
- Full ADF (Atlassian Document Format) — `contentFormat: "adf"`, passing a real `{ "type": "doc", "version": 1, "content": [...] }` object (not a string) — is the most robust option, since it hands Jira a structured document tree with no string-escaping step at all. Confirmed working for CAR-280, including a 3-column table (`table`/`tableRow`/`tableHeader`/`tableCell` nodes).

## Not yet confirmed

Markdown **tables** specifically via `editJiraIssue`'s `contentFormat: "markdown"` path — every table-bearing ticket this session was fixed via ADF instead, so that combination has never been tested. Until it has been:

- Either use ADF for any description containing a table, or
- Restructure the content to avoid a table (a bullet list usually works fine for the same information).

## Convention going forward

1. **Never trust `createJiraIssue`'s `contentFormat: "markdown"` for real content.** If a ticket needs more than one plain sentence, create it with a minimal placeholder description, then immediately follow with an `editJiraIssue` call (`contentFormat: "markdown"`) carrying the actual content. This is the cheapest reliable recipe — no ADF authoring overhead for ordinary tickets.
2. **Use ADF instead of markdown when the description contains a table**, or any other structure more complex than headings/bold/code/lists, until that gap above is closed by an actual test.
3. **Always read the ticket back after writing it**, before considering the write done: `getJiraIssue` with `responseContentFormat: "markdown"`, and check for literal `\n` sequences or unrendered `##`/backtick-fence text. A successful tool-call response is not evidence the content rendered correctly — this is the same distinction CLAUDE.md's Verification section already draws for code changes (a passing check proves what it proves, nothing more), applied here to Jira writes specifically.
4. **Don't assume a batch of previously created tickets is fine** just because no one complained yet. Six of roughly ten tickets created in one session had this bug before it was caught — silence isn't confirmation.

## Minimal ADF reference

For anything beyond plain paragraphs, these are the node shapes actually used and confirmed working:

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Section title" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Plain text, " },
        { "type": "text", "text": "bold text", "marks": [{ "type": "strong" }] },
        { "type": "text", "text": ", " },
        { "type": "text", "text": "inline code", "marks": [{ "type": "code" }] }
      ]
    },
    {
      "type": "codeBlock",
      "attrs": { "language": "typescript" },
      "content": [{ "type": "text", "text": "const x = 1;\nconst y = 2;" }]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            { "type": "paragraph", "content": [{ "type": "text", "text": "First item" }] }
          ]
        }
      ]
    },
    {
      "type": "table",
      "attrs": { "isNumberColumnEnabled": false, "layout": "default" },
      "content": [
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableHeader",
              "content": [
                { "type": "paragraph", "content": [{ "type": "text", "text": "Column A" }] }
              ]
            }
          ]
        },
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableCell",
              "content": [
                { "type": "paragraph", "content": [{ "type": "text", "text": "Row value" }] }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Note: inside a `codeBlock`'s `text`, a real `\n` character is a genuine line break in the source being quoted (JSON string escaping still applies as normal) — that's different from the bug above, where `\n` leaked into _prose_ paragraphs as literal visible text instead of becoming a paragraph break.
