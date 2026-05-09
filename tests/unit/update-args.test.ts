// tests/unit/update-args.test.ts
import { describe, test, expect } from 'vitest';
import { parseArgs }              from '../../lib/args/update-args';

describe('parseArgs — update-status', () => {

  test('parses --id and --status', () => {
    const flags = parseArgs(['--id', '42', '--status', 'Closed']);
    expect(flags.id).toBe('42');
    expect(flags.status).toBe('Closed');
  });

  test('parses single --reasons value', () => {
    const flags = parseArgs(['--id', '1', '--status', 'Skipped', '--reasons', 'Location']);
    expect(flags.reasons).toEqual(['Location']);
  });

  test('parses multiple --reasons values', () => {
    const flags = parseArgs(['--id', '1', '--status', 'Skipped', '--reasons', 'Location', 'Compensation']);
    expect(flags.reasons).toEqual(['Location', 'Compensation']);
  });

  test('parses --termination values', () => {
    const flags = parseArgs(['--id', '1', '--status', 'Closed', '--termination', 'Screened Out']);
    expect(flags.termination).toEqual(['Screened Out']);
  });

  test('parses --note', () => {
    const flags = parseArgs(['--id', '1', '--status', 'Skipped', '--reasons', 'Location', '--note', 'Austin in-office']);
    expect(flags.note).toBe('Austin in-office');
  });

  test('returns empty arrays for reasons and termination when not provided', () => {
    const flags = parseArgs(['--id', '1', '--status', 'Applied']);
    expect(flags.reasons).toEqual([]);
    expect(flags.termination).toEqual([]);
  });

  test('returns defaults for empty argv', () => {
    const flags = parseArgs([]);
    expect(flags.id).toBeUndefined();
    expect(flags.status).toBeUndefined();
    expect(flags.reasons).toEqual([]);
    expect(flags.termination).toEqual([]);
  });

});
