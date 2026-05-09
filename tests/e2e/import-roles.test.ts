// tests/e2e/import-roles.test.ts
import { describe, test, expect } from 'vitest';
import { runScript }              from '../helpers/run-script';

const validFile = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer
Description:
This is a job description.

--

URL: https://example.com/job/2
Company: Beta Corp
Title: Senior QA Engineer
Description:
Another job description.

--`;

const fileWithBlankRecord = `URL: https://example.com/job/1
Company: Acme
Title: QA Engineer
Description:
JD text.

--

URL:
Company:
Title:
Description:

--`;

describe('import-roles.ts', () => {

  test('inserts valid records and outputs summary', () => {
    const { stdout, exitCode } = runScript('import-roles.ts', validFile);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Inserted:');
    expect(stdout).toContain('Summary: 2 inserted, 0 skipped');
  });

  test('skips invalid records and reports them', () => {
    const { stdout, exitCode } = runScript('import-roles.ts', fileWithBlankRecord);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Inserted:');
    expect(stdout).toContain('Skipped:');
    expect(stdout).toContain('Summary: 1 inserted, 1 skipped');
  });

  test('outputs line number for skipped records', () => {
    const { stdout } = runScript('import-roles.ts', fileWithBlankRecord);
    expect(stdout).toMatch(/Skipped:.*line \d+/);
  });

});
