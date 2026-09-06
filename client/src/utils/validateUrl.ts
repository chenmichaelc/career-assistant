// client/src/utils/validateUrl.ts

import { cleanseUrl, InvalidUrlError } from '../../../lib/url-cleanse';

// Returns null when valid, or a user-facing error message otherwise.
export function validateUrl(rawUrl: string): string | null {
  try {
    cleanseUrl(rawUrl);
    return null;
  } catch (err) {
    return err instanceof InvalidUrlError ? err.message : (err as Error).message;
  }
}
