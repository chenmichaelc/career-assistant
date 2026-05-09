// tests/unit/list-args.test.ts
import { describe, test, expect } from 'vitest';
import { parseArgs }              from '../../lib/args/list-args';

describe('parseArgs — list-roles', () => {

  test('parses --status flag', () => {
    const flags = parseArgs(['--status', 'Applied']);
    expect(flags.status).toBe('Applied');
  });

  test('parses --company flag', () => {
    const flags = parseArgs(['--company', 'Akamai']);
    expect(flags.company).toBe('Akamai');
  });

  test('parses both flags together', () => {
    const flags = parseArgs(['--status', 'Skipped', '--company', 'Acme']);
    expect(flags.status).toBe('Skipped');
    expect(flags.company).toBe('Acme');
  });

  test('returns empty object for empty argv', () => {
    const flags = parseArgs([]);
    expect(flags.status).toBeUndefined();
    expect(flags.company).toBeUndefined();
  });

});
