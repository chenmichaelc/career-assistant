// client/tests/unit/utils/validateUrl.test.ts

import { describe, test, expect } from 'vitest';
import { validateUrl } from '../../../src/utils/validateUrl';

describe('validateUrl', () => {
  test('accepts a well-formed https URL', () => {
    expect(validateUrl('https://example.com/jobs/1')).toEqual({ valid: true });
  });

  test('accepts a bare domain (treated as https)', () => {
    expect(validateUrl('example.com/jobs/1')).toEqual({ valid: true });
  });

  test('rejects an unparseable URL with a message', () => {
    expect(validateUrl('not a url')).toEqual({
      valid: false,
      message: 'Not a valid URL: "not a url"',
    });
  });

  test('rejects a non-http(s) scheme with a message', () => {
    expect(validateUrl('ftp://example.com/file')).toEqual({
      valid: false,
      message: 'Not a valid URL: "ftp://example.com/file"',
    });
  });
});
