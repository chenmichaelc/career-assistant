// tests/unit/list-args.test.ts
import { describe, test, expect } from 'vitest';
import { parseArgs } from '../../lib/args/list-args';

describe('list-roles parseArgs function', () => {
  test('parses --status flag correctly', () => {
    const flags = parseArgs(['--status', 'Applied']);
    expect(flags.status).toBe('Applied');
  });

  test('parses --company flag correctly', () => {
    const flags = parseArgs(['--company', 'Akamai']);
    expect(flags.company).toBe('Akamai');
  });

  test('parses --status and --company flags together properly', () => {
    const flags = parseArgs(['--status', 'Skipped', '--company', 'Acme']);
    expect(flags.status).toBe('Skipped');
    expect(flags.company).toBe('Acme');
  });

  test('parses --company and --status flags together properly', () => {
    const flags = parseArgs(['--company', 'Acme', '--status', 'Skipped']);
    expect(flags.status).toBe('Skipped');
    expect(flags.company).toBe('Acme');
  });

  test('returns empty object for empty argv', () => {
    const flags = parseArgs([]);
    expect(flags.status).toBeUndefined();
    expect(flags.company).toBeUndefined();
  });
});
