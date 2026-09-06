// client/src/utils/validateUrl.ts

import { cleanseUrl, InvalidUrlError } from '../../../lib/url-cleanse';

export type UrlValidation = { valid: true } | { valid: false; message: string };

export function validateUrl(rawUrl: string): UrlValidation {
  try {
    cleanseUrl(rawUrl);
    return { valid: true };
  } catch (err) {
    const message = err instanceof InvalidUrlError ? err.message : (err as Error).message;
    return { valid: false, message };
  }
}
