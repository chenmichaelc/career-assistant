// tests/unit/parse-records.test.ts
import { describe, test, expect } from 'vitest';
import { parseRecords } from '../../lib/parse-records';

describe('parseRecords — basic parsing', () => {
  test('parses a single complete record', () => {
    const input = `URL: https://example.com/job/1?i=2&ref=test
Company: Acme/Turner & Sons
Title: QA Engineer (III), Part II
Salary Min: 110000
Salary Max: 130000
Description:
This is the job description.
It spans multiple lines.
And special characters: &, /, (, ), comma, "quotes", 'apostrophes'.
And a URL: https://example.com/job/1?i=2&ref=test.

--`;

    const records = parseRecords(input);

    expect(records).toHaveLength(1);
    expect(records[0].url).toBe('https://example.com/job/1?i=2&ref=test');
    expect(records[0].company).toBe('Acme/Turner & Sons');
    expect(records[0].title).toBe('QA Engineer (III), Part II');
    expect(records[0].salary_min).toBe(110000);
    expect(records[0].salary_max).toBe(130000);
    expect(records[0].jd).toContain('This is the job description.');
    expect(records[0].jd).toContain('It spans multiple lines.');
    expect(records[0].jd).toContain(
      'And special characters: &, /, (, ), comma, "quotes", \'apostrophes\'.'
    );
    expect(records[0].jd).toContain('And a URL: https://example.com/job/1?i=2&ref=test.');
  });

  test('parses multiple records', () => {
    const input = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer
Salary Min: 90000
Description:
First JD.

--

URL: https://example.com/job/2
Company: Beta Corp
Title: Senior QA Engineer
Salary Max: 130000
Description:
Second JD.

--`;

    const records = parseRecords(input);
    expect(records).toHaveLength(2);
    expect(records[0].url).toBe('https://example.com/job/1');
    expect(records[0].company).toBe('Acme');
    expect(records[0].title).toBe('QA Engineer');
    expect(records[0].salary_min).toBe(90000);
    expect(records[0].salary_max).toBe(null);
    expect(records[0].jd).toBe('First JD.');
    expect(records[1].url).toBe('https://example.com/job/2');
    expect(records[1].company).toBe('Beta Corp');
    expect(records[1].title).toBe('Senior QA Engineer');
    expect(records[1].salary_min).toBe(null);
    expect(records[1].salary_max).toBe(130000);
    expect(records[1].jd).toBe('Second JD.');
  });

  test('defaults role_status to Pending Triage', () => {
    const input = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer
Description:
JD text.

--`;

    const records = parseRecords(input);
    expect(records[0].role_status).toBe('Pending Triage');
  });

  test('defaults candidacy and notes to null', () => {
    const input = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer
Description:
JD text.

--`;

    const records = parseRecords(input);
    expect(records[0].candidacy).toBeNull();
    expect(records[0].notes).toBeNull();
  });
});

describe('parseRecords — missing fields', () => {
  test('sets missing url to null', () => {
    const input = `Company: Acme
Title: QA Engineer
Description:
JD text.

--`;

    const records = parseRecords(input);
    expect(records[0].url).toBeNull();
  });

  test('sets empty url to null', () => {
    const input = `URL:
Company: Acme
Title: QA Engineer
Description:
JD text.

--`;

    const records = parseRecords(input);
    expect(records[0].url).toBeNull();
  });

  test('sets missing company to null', () => {
    const input = `URL: https://example.com/job/1
Title: QA Engineer
Description:
JD text.

--`;

    const records = parseRecords(input);
    expect(records[0].company).toBeNull();
  });

  test('sets missing salary fields to null', () => {
    const input = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer
Description:
JD text.

--`;

    const records = parseRecords(input);
    expect(records[0].salary_min).toBeNull();
    expect(records[0].salary_max).toBeNull();
  });

  test('sets missing description to null', () => {
    const input = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer

--`;

    const records = parseRecords(input);
    expect(records[0].jd).toBeNull();
  });
});

describe('parseRecords — edge cases', () => {
  test('handles file that does not end with --', () => {
    const input = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer
Description:
JD text.`;

    const records = parseRecords(input);
    expect(records).toHaveLength(1);
    expect(records[0].company).toBe('Acme');
    expect(records[0].jd).toBe('JD text.');
  });

  test('trims whitespace from JD content', () => {
    const input = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer
Description:
 JD text with leading whitespace.

--`;

    const records = parseRecords(input);
    expect(records[0].jd).toBe('JD text with leading whitespace.');
  });

  test('records include _startLine for error reporting', () => {
    const input = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer
Description:
JD text.

--`;

    const records = parseRecords(input);
    expect(records[0]._startLine).toBe(1);
  });

  test('field matching is case-insensitive', () => {
    const input = `uRl: https://example.com/job/1
coMpanY: Acme
titLe: QA Engineer
description:
JD text.

--`;

    const records = parseRecords(input);
    expect(records[0].url).toBe('https://example.com/job/1');
    expect(records[0].company).toBe('Acme');
    expect(records[0].title).toBe('QA Engineer');
  });
});
