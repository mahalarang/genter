import type { Extractor, ExtractResult } from '../extractor.js';
import { extractIdFromUrl } from './helpers.js';

/**
 * Extracts direct CDN video URLs from xpvid.cc and its alias domains.
 *
 * Recognized domains:
 *   - xpvid.cc
 *   - vidbl.ing    (redirects to xpvid.cc)
 *
 * Flow:
 *   1. Parse video ID from the page URL
 *   2. Fetch the embed page with Referer header
 *   3. Parse <source src="..."> and <title> from the HTML
 *   4. Return the CDN video URL + suggested filename
 */

/** Domains that serve xpvid.cc content (either directly or via redirect). */
const KNOWN_DOMAINS = ['xpvid.cc', 'vidbl.ing'];

export class XpvidExtractor implements Extractor {
  canHandle(url: string): boolean {
    return KNOWN_DOMAINS.some((domain) => url.includes(domain));
  }

  async extract(pageUrl: string): Promise<ExtractResult> {
    const id = extractIdFromUrl(pageUrl);
    const embedUrl = `https://xpvid.cc/embed.php?bucket=vidoycdn&id=${id}`;

    // In the browser, proxy through the dev server to bypass CORS.
    const fetchUrl =
      typeof window !== 'undefined'
        ? `/proxy/xpvid/embed.php?bucket=vidoycdn&id=${id}`
        : embedUrl;

    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    // Referer only needed for direct requests (not through proxy).
    if (typeof window === 'undefined') {
      fetchHeaders['Referer'] = 'https://xpvid.cc/';
    }

    const response = await fetch(fetchUrl, { headers: fetchHeaders });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch embed page: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();

    // Parse <source src="..." type="...">
    const srcMatch = html.match(/<source\s+src="([^"]+)"/);
    if (!srcMatch) {
      throw new Error('Could not find <source> tag in embed page');
    }

    // Parse <title>...</title> for the suggested filename.
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const rawTitle = titleMatch ? titleMatch[1].trim() : '';
    // Decode HTML entities (e.g., &#39; → ')
    const title = rawTitle
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
        String.fromCharCode(parseInt(h, 16)),
      );

    // Ensure filename has an extension.
    let filename = title || id + '.mp4';
    if (!filename.includes('.')) {
      filename += '.mp4';
    }

    const videoUrl = srcMatch[1];

    // In the browser, also proxy the CDN video URL (browsers
    // cannot set the Referer header required by the CDN).
    const proxiedVideoUrl =
      typeof window !== 'undefined'
        ? videoUrl.replace('https://meiva.overfetch.video', '/proxy/cdn')
        : videoUrl;

    return {
      videoUrl: proxiedVideoUrl,
      filename,
    };
  }
}
