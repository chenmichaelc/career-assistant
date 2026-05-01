// tests/e2e/add-role.test.js
// E2E tests for scripts/add-role.js

const { runScript } = require('../helpers/run-script');

const validRole = JSON.stringify({
  company:     'Acme',
  title:       'QA Engineer',
  url:         'https://example.com/job/1',
  role_status: 'Pending Triage',
  jd:          'This is a job description.',
});

describe('add-role.js', () => {

  test('outputs a numeric ID on valid input', () => {
    const { stdout, exitCode } = runScript('add-role.js', validRole);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+$/);
  });

  test('exits with code 1 on invalid JSON', () => {
    const { stderr, exitCode } = runScript('add-role.js', 'not valid json');
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Invalid JSON input');
  });

  test('exits with code 1 on missing required fields', () => {
    const input = JSON.stringify({ company: 'Acme' });
    const { stderr, exitCode } = runScript('add-role.js', input);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Validation failed');
  });

});
