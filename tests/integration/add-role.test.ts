// tests/integration/add-role.test.ts
import { describe, test, expect } from 'vitest';
import { runScript } from '../helpers/run-script';
import { RoleInput } from '../../lib/types';

const validRole: RoleInput = {
  company: 'Acme',
  title: 'QA Engineer',
  url: 'https://example.com/job/1',
  role_status: 'Pending Triage',
  jd: 'This is a job description.',
};

describe('add-role.ts', () => {
  test('outputs a numeric ID on valid input', () => {
    const { stdout, exitCode } = runScript('add-role.ts', JSON.stringify(validRole));
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+$/);
  });

  test('exits with code 1 on invalid JSON', () => {
    const { stderr, exitCode } = runScript('add-role.ts', 'not valid json');
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Invalid JSON input');
  });

  test('exits with code 1 on missing required fields', () => {
    const input = JSON.stringify({ company: 'Acme' });
    const { stderr, exitCode } = runScript('add-role.ts', input);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Validation failed');
  });
});
