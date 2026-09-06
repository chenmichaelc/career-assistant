// client/tests/unit/utils/validateUrl.test.ts

import { describe, test, expect } from 'vitest';
import { validateUrl } from '../../../src/utils/validateUrl';

describe('validateUrl', () => {
  test('returns null for a well-formed https URL', () => {
    expect(validateUrl('https://example.com/jobs/1')).toBeNull();
  });

  test('returns null for a bare domain (treated as https)', () => {
    expect(validateUrl('example.com/jobs/1')).toBeNull();
  });

  test('returns an error message for an unparseable URL', () => {
    expect(validateUrl('not a url')).toBe('Not a valid URL: "not a url"');
  });

  test('returns an error message for a non-http(s) scheme', () => {
    expect(validateUrl('ftp://example.com/file')).toBe('Not a valid URL: "ftp://example.com/file"');
  });
});
