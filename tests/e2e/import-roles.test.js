// tests/e2e/import-roles.test.js
// E2E tests for scripts/import-roles.js

const { runScript } = require('../helpers/run-script');

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

describe('import-roles.js', () => {

  test('inserts valid records and outputs summary', () => {
    const { stdout, exitCode } = runScript('import-roles.js', validFile);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Inserted:');
    expect(stdout).toContain('Summary: 2 inserted, 0 skipped');
  });

  test('skips invalid records and reports them', () => {
    const { stdout, exitCode } = runScript('import-roles.js', fileWithBlankRecord);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Inserted:');
    expect(stdout).toContain('Skipped:');
    expect(stdout).toContain('Summary: 1 inserted, 1 skipped');
  });

  test('outputs line number for skipped records', () => {
    const { stdout } = runScript('import-roles.js', fileWithBlankRecord);
    expect(stdout).toMatch(/Skipped:.*line \d+/);
  });

});
