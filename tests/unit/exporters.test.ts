// tests/unit/exporters.test.ts
import { describe, test, expect } from 'vitest';
import { simpleExport } from '../../lib/exporters/simple';
import { richExport } from '../../lib/exporters/rich';
import { exportRole } from '../../lib/exporters';
import { RoleRow } from '../../lib/types';

// ─── Minimal test fixture ─────────────────────────────────────────────────────

const baseRole = {
  company: 'Acme/Turner & Sons',
  title: 'QA Engineer (III), Part II',
  url: 'https://example.com/job/1?i=2',
  salary_min: 110000,
  salary_max: 130000,
  jd: `This is a job description.
It spans multiple lines.
Special characters: &, /, (, ), "quotes", 'apostrophes'.`,
} as unknown as RoleRow;

const roleWithNulls = {
  company: 'Acme',
  title: 'QA Engineer',
  url: null,
  salary_min: null,
  salary_max: null,
  jd: '',
} as unknown as RoleRow;

// ─── simpleExport ─────────────────────────────────────────────────────────────

describe('simpleExport', () => {
  test('output contains company', () => {
    const output = simpleExport(baseRole);
    expect(output).toContain('Company: Acme/Turner & Sons');
  });

  test('output contains title', () => {
    const output = simpleExport(baseRole);
    expect(output).toContain('Title: QA Engineer (III), Part II');
  });

  test('output contains JD content', () => {
    const output = simpleExport(baseRole);
    expect(output).toContain('This is a job description.');
    expect(output).toContain('It spans multiple lines.');
  });

  test('output preserves special characters in JD', () => {
    const output = simpleExport(baseRole);
    expect(output).toContain('Special characters: &, /, (, ), "quotes", \'apostrophes\'.');
  });

  test('output handles empty JD gracefully', () => {
    const output = simpleExport(roleWithNulls);
    expect(output).toContain('Company: Acme');
    expect(output).toContain('Title: QA Engineer');
  });

  test('output does not include URL or salary fields', () => {
    const output = simpleExport(baseRole);
    expect(output).not.toContain('URL:');
    expect(output).not.toContain('Salary');
  });
});

// ─── richExport ───────────────────────────────────────────────────────────────

describe('richExport', () => {
  test('output contains URL', () => {
    const output = richExport(baseRole);
    expect(output).toContain('URL: https://example.com/job/1?i=2');
  });

  test('output contains company', () => {
    const output = richExport(baseRole);
    expect(output).toContain('Company: Acme/Turner & Sons');
  });

  test('output contains title', () => {
    const output = richExport(baseRole);
    expect(output).toContain('Title: QA Engineer (III), Part II');
  });

  test('output contains salary fields', () => {
    const output = richExport(baseRole);
    expect(output).toContain('Salary Min: 110000');
    expect(output).toContain('Salary Max: 130000');
  });

  test('output contains Description label', () => {
    const output = richExport(baseRole);
    expect(output).toContain('Description:');
  });

  test('output contains JD content', () => {
    const output = richExport(baseRole);
    expect(output).toContain('This is a job description.');
    expect(output).toContain('It spans multiple lines.');
  });

  test('output ends with --', () => {
    const output = richExport(baseRole);
    expect(output.trim()).toMatch(/--$/);
  });

  test('null URL renders as empty string not "null"', () => {
    const output = richExport(roleWithNulls);
    expect(output).toContain('URL: \n');
    expect(output).not.toContain('URL: null');
  });

  test('null salary fields render as empty string not "null"', () => {
    const output = richExport(roleWithNulls);
    expect(output).toContain('Salary Min: \n');
    expect(output).toContain('Salary Max: \n');
    expect(output).not.toContain('null');
  });

  test('output handles empty JD gracefully', () => {
    const output = richExport(roleWithNulls);
    expect(output).toContain('Description:');
    expect(output.trim()).toMatch(/--$/);
  });

  test('output is re-importable — contains all importer fields', () => {
    const output = richExport(baseRole);
    expect(output).toMatch(/^URL:/m);
    expect(output).toMatch(/^Company:/m);
    expect(output).toMatch(/^Title:/m);
    expect(output).toMatch(/^Salary Min:/m);
    expect(output).toMatch(/^Salary Max:/m);
    expect(output).toMatch(/^Description:/m);
    expect(output).toMatch(/^--$/m);
  });
});

// ─── exportRole orchestrator ──────────────────────────────────────────────────

describe('exportRole', () => {
  test('selects simple format correctly', () => {
    const output = exportRole(baseRole, 'simple');
    expect(output).toContain('Company:');
    expect(output).not.toContain('URL:');
  });

  test('selects rich format correctly', () => {
    const output = exportRole(baseRole, 'rich');
    expect(output).toContain('URL:');
    expect(output).toContain('Description:');
  });

  test('throws on unknown format', () => {
    expect(() => exportRole(baseRole, 'unknown' as never)).toThrow('Unknown export format');
  });
});
