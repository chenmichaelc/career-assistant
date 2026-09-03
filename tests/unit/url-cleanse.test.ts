// tests/unit/url-cleanse.test.ts
import { describe, test, expect } from 'vitest';
import { cleanseUrl, InvalidUrlError } from '../../lib/url-cleanse';

describe('cleanseUrl — protocol', () => {
  test('normalizes http to https', () => {
    expect(cleanseUrl('http://example.com/jobs/1')).toBe('https://example.com/jobs/1');
  });

  test('leaves https as-is', () => {
    expect(cleanseUrl('https://example.com/jobs/1')).toBe('https://example.com/jobs/1');
  });
});

describe('cleanseUrl — hostname', () => {
  test('lowercases the hostname', () => {
    expect(cleanseUrl('https://EXAMPLE.com/jobs/1')).toBe('https://example.com/jobs/1');
  });

  test('does not lowercase the path', () => {
    expect(cleanseUrl('https://example.com/Jobs/ABC123')).toBe('https://example.com/Jobs/ABC123');
  });
});

describe('cleanseUrl — port', () => {
  test('strips the default https port (443)', () => {
    expect(cleanseUrl('https://example.com:443/jobs/1')).toBe('https://example.com/jobs/1');
  });

  test('keeps a non-default port', () => {
    expect(cleanseUrl('https://example.com:8443/jobs/1')).toBe('https://example.com:8443/jobs/1');
  });
});

describe('cleanseUrl — trailing slash', () => {
  test('strips a trailing slash from the path', () => {
    expect(cleanseUrl('https://example.com/jobs/1/')).toBe('https://example.com/jobs/1');
  });

  test('keeps the root path as "/"', () => {
    expect(cleanseUrl('https://example.com/')).toBe('https://example.com/');
  });
});

describe('cleanseUrl — fragment', () => {
  test('strips a fragment', () => {
    expect(cleanseUrl('https://example.com/jobs/1#section')).toBe('https://example.com/jobs/1');
  });
});

describe('cleanseUrl — tracking params', () => {
  test('strips utm_* params', () => {
    expect(cleanseUrl('https://example.com/jobs/1?utm_source=linkedin&utm_medium=social')).toBe(
      'https://example.com/jobs/1'
    );
  });

  test('strips gclid, fbclid, and other known tracking params', () => {
    expect(cleanseUrl('https://example.com/jobs/1?gclid=x&fbclid=y&trk=z')).toBe(
      'https://example.com/jobs/1'
    );
  });

  test('keeps non-tracking params', () => {
    expect(cleanseUrl('https://example.com/jobs/1?ref=abc&keep=me')).toBe(
      'https://example.com/jobs/1?keep=me'
    );
  });

  test('sorts remaining params alphabetically, independent of input order', () => {
    expect(cleanseUrl('https://example.com/jobs/1?b=2&a=1')).toBe(
      'https://example.com/jobs/1?a=1&b=2'
    );
  });
});

describe('cleanseUrl — whitespace', () => {
  test('trims leading and trailing whitespace', () => {
    expect(cleanseUrl('  https://example.com/jobs/1  ')).toBe('https://example.com/jobs/1');
  });
});

describe('cleanseUrl — the actual dedup scenario', () => {
  test('two differently-decorated URLs to the same posting normalize identically', () => {
    const a = cleanseUrl('http://EXAMPLE.com/jobs/123/?utm_source=linkedin&b=2&a=1');
    const b = cleanseUrl('https://example.com/jobs/123?a=1&utm_campaign=x&b=2');
    expect(a).toBe(b);
  });
});

describe('cleanseUrl — invalid input', () => {
  test('throws InvalidUrlError for a non-URL string', () => {
    expect(() => cleanseUrl('not a url at all')).toThrow(InvalidUrlError);
  });

  test('throws InvalidUrlError for an empty string', () => {
    expect(() => cleanseUrl('')).toThrow(InvalidUrlError);
  });

  test('throws InvalidUrlError for a whitespace-only string', () => {
    expect(() => cleanseUrl('   ')).toThrow(InvalidUrlError);
  });
});

describe('cleanseUrl — bare domain retry', () => {
  test('a bare domain with no scheme is treated as https', () => {
    expect(cleanseUrl('linkedin.com/jobs/123')).toBe('https://linkedin.com/jobs/123');
  });

  test('a bare domain with a port is rejected, not silently corrected', () => {
    expect(() => cleanseUrl('example.com:8080/jobs/1')).toThrow(InvalidUrlError);
  });

  test('input that already looks like a failed scheme attempt is not silently reinterpreted', () => {
    expect(() => cleanseUrl('ht!tp://example.com')).toThrow(InvalidUrlError);
  });
});

describe('cleanseUrl — scheme restriction', () => {
  test('rejects mailto: URLs', () => {
    expect(() => cleanseUrl('mailto:someone@example.com')).toThrow(InvalidUrlError);
  });

  test('rejects javascript: URLs', () => {
    expect(() => cleanseUrl('javascript:alert(1)')).toThrow(InvalidUrlError);
  });

  test('rejects data: URLs', () => {
    expect(() => cleanseUrl('data:text/html,hello')).toThrow(InvalidUrlError);
  });

  test('rejects file: URLs', () => {
    expect(() => cleanseUrl('file:///etc/passwd')).toThrow(InvalidUrlError);
  });

  test('rejects ftp: URLs', () => {
    expect(() => cleanseUrl('ftp://example.com/jobs/1')).toThrow(InvalidUrlError);
  });

  test('still accepts http and https', () => {
    expect(cleanseUrl('http://example.com/jobs/1')).toBe('https://example.com/jobs/1');
    expect(cleanseUrl('https://example.com/jobs/1')).toBe('https://example.com/jobs/1');
  });
});
