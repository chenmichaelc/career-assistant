// client/tests/unit/utils/storedReasons.test.ts

import { describe, test, expect } from 'vitest';
import { parseStoredReasons } from '@/utils/storedReasons';

describe('parseStoredReasons', () => {
  const storedReasons = [
    { reason: 'Location', note: null },
    { reason: 'Compensation', note: 'Below range' },
  ];

  test('parses stored JSON text into reason entries', () => {
    expect(parseStoredReasons(JSON.stringify(storedReasons))).toEqual(storedReasons);
  });

  test.each([
    ['null', null],
    ['an empty string', ''],
  ])('%s means no reasons', (_description, storedJson) => {
    expect(parseStoredReasons(storedJson)).toEqual([]);
  });

  test('unparseable text is treated as no reasons instead of throwing', () => {
    expect(parseStoredReasons('not json')).toEqual([]);
  });

  test('valid JSON that is not an array is treated as no reasons', () => {
    expect(parseStoredReasons('{"reason":"Location"}')).toEqual([]);
  });
});
