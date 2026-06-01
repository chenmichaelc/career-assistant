// tests/unit/update-args.test.ts
import { describe, test, expect } from 'vitest';
import { parseArgs }              from '../../lib/args/update-args';

describe('update-roles parseArgs function', () => {

  test('parses --id and --status correctly', () => {
    const flags = parseArgs(['--id', '42', '--status', 'Closed']);
    expect(flags.id).toBe('42');
    expect(flags.status).toBe('Closed');
  });


  test('parses --status and --id correctly', () => {
    const flags = parseArgs(['--status', 'Closed', '--id', '42']);
    expect(flags.id).toBe('42');
    expect(flags.status).toBe('Closed');
  });

  test('parses single --reasons value correctly', () => {
    const flags = parseArgs(['--id', '1', '--status', 'Skipped', '--reasons', 'Location']);
    expect(flags.reasons).toEqual(['Location']);
  });

  test('parses multiple --reasons values correctly at end of line', () => {
    const flags = parseArgs(['--id', '1', '--status', 'Skipped', '--reasons', 'Location', 'Compensation']);
    expect(flags.id).toEqual('1');
    expect(flags.status).toEqual('Skipped');
    expect(flags.reasons).toEqual(['Location', 'Compensation']);
  });

  test('parses multiple --reasons values correctly at middle of line correctly', () => {
    const flags = parseArgs(['--id', '1', '--reasons', 'Location', 'Compensation', '--status', 'Skipped']);
    expect(flags.id).toEqual('1');
    expect(flags.reasons).toEqual(['Location', 'Compensation']);
    expect(flags.status).toEqual('Skipped');
  });

  test('parses --termination values', () => {
    const flags = parseArgs(['--id', '1', '--status', 'Closed', '--termination', 'Screened Out']);
    expect(flags.termination).toEqual(['Screened Out']);
  });

  test('parses --note correctly', () => {
    const flags = parseArgs(['--id', '1', '--status', 'Skipped', '--reasons', 'Location', '--note', 'Austin in-office']);
    expect(flags.note).toBe('Austin in-office');
  });
  
  test('handles single quotes in --note content gracefully', () => {
    const noteValue = 'O\'Hare Airport'
    const flags = parseArgs(['--id', '1', '--status', 'Skipped', '--reasons', 'Location', '--note', noteValue]);
    expect(flags.note).toBe(noteValue);
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
