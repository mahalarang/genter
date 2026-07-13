/**
 * Extracts the video ID from a page URL.
 *
 * Examples:
 *   https://xpvid.cc/e/p1bwqns1lq9g     → p1bwqns1lq9g
 *   https://xpvid.cc/e/p1bwqns1lq9g/    → p1bwqns1lq9g
 */
export function extractIdFromUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  const parts = trimmed.split('/');
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] !== '') {
      return parts[i];
    }
  }
  throw new Error(`Could not extract video ID from URL: ${url}`);
}
