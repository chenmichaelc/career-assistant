// lib/url-cleanse.ts
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'twclid',
  '_ga',
  'ref',
  'referrer',
  'source',
  'trk', // LinkedIn-specific tracking param
  'trackingId', // LinkedIn-specific tracking param
]);

export class InvalidUrlError extends Error {
  constructor(rawUrl: string) {
    super(`Not a valid URL: "${rawUrl}"`);
    this.name = 'InvalidUrlError';
  }
}

// ─── cleanseUrl steps ─────────────────────────────────────────────────────────

function parseUrlWithRetry(rawUrl: string): URL {
  const trimmed = rawUrl.trim();

  try {
    return new URL(trimmed);
  } catch {
    if (!trimmed.includes('://')) {
      try {
        return new URL(`https://${trimmed}`);
      } catch {
        throw new InvalidUrlError(rawUrl);
      }
    } else {
      throw new InvalidUrlError(rawUrl);
    }
  }
}

function normalizeProtocol(parsed: URL, rawUrl: string): void {
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidUrlError(rawUrl);
  }

  if (parsed.protocol === 'http:') {
    parsed.protocol = 'https:';
  }
}

function stripDefaultPort(parsed: URL): void {
  if (
    (parsed.protocol === 'https:' && parsed.port === '443') ||
    (parsed.protocol === 'http:' && parsed.port === '80')
  ) {
    parsed.port = '';
  }
}

function stripTrackingParams(parsed: URL): void {
  const remainingParams: [string, string][] = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!TRACKING_PARAMS.has(key)) {
      remainingParams.push([key, value]);
    }
  }
  remainingParams.sort(([a], [b]) => a.localeCompare(b));

  parsed.search = '';
  for (const [key, value] of remainingParams) {
    parsed.searchParams.append(key, value);
  }
}

function stripTrailingSlash(parsed: URL): void {
  // Strip a trailing slash from the path, except when the path is just "/".
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
}

// ─── cleanseUrl ───────────────────────────────────────────────────────────────

export function cleanseUrl(rawUrl: string): string {
  const parsed = parseUrlWithRetry(rawUrl);

  normalizeProtocol(parsed, rawUrl);
  parsed.hostname = parsed.hostname.toLowerCase();
  stripDefaultPort(parsed);
  stripTrackingParams(parsed);
  stripTrailingSlash(parsed);

  // Fragments (#...) are client-side navigation hints, never meaningful for
  // identifying a distinct posting.
  parsed.hash = '';

  return parsed.toString();
}
