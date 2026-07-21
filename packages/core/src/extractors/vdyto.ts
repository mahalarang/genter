import type { Extractor, ExtractResult } from '../extractor.js';
import { extractIdFromUrl } from './helpers.js';

/**
 * Extracts video URLs from vdy.to pages.
 *
 * Flow:
 *   1. Fetch page HTML → extract embedToken + iframeId
 *   2. Fetch /ip129jk iframe → extract stream.php URL
 *   3. Fetch stream.php → extract <source> CDN URL
 */
export class VdytoExtractor implements Extractor {
  canHandle(url: string): boolean {
    return url.includes('vdy.to');
  }

  async extract(pageUrl: string): Promise<ExtractResult> {
    const origin = new URL(pageUrl).origin;
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': origin + '/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // Step 1: Fetch page, extract token + iframeId.
    const pageResp = await fetch(pageUrl, { headers });
    if (!pageResp.ok) {
      throw new Error(`Failed to fetch page: ${pageResp.status}`);
    }
    const pageHtml = await pageResp.text();

    const titleMatch = pageHtml.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const tokenMatch = pageHtml.match(/var embedToken = '([^']+)'/);
    if (!tokenMatch) {
      throw new Error('Could not find embedToken in page');
    }
    const embedToken = tokenMatch[1];

    const iframeIdMatch = pageHtml.match(/var iframeId = '([^']+)'/);
    if (!iframeIdMatch) {
      throw new Error('Could not find iframeId in page');
    }
    const iframeId = iframeIdMatch[1];

    // Step 2: Fetch iframe, extract stream URL.
    const iframeUrl = `${origin}/ip129jk?id=${iframeId}&t=${embedToken}`;
    const iframeResp = await fetch(iframeUrl, { headers });
    if (!iframeResp.ok) {
      throw new Error(`Failed to fetch iframe: ${iframeResp.status}`);
    }
    const iframeHtml = await iframeResp.text();

    const prefetchMatch = iframeHtml.match(/<link\s+rel="prefetch"\s+href="([^"]+)"/);
    if (!prefetchMatch) {
      throw new Error('Could not find stream URL in iframe');
    }
    const rawUrl = prefetchMatch[1].replace(/&amp;/g, '&');
    const streamUrl = rawUrl.startsWith('http') ? rawUrl : origin + rawUrl;

    // Step 3: Fetch stream page, extract <source>.
    const streamResp = await fetch(streamUrl, { headers });
    if (!streamResp.ok) {
      throw new Error(`Failed to fetch stream page: ${streamResp.status}`);
    }
    const streamHtml = await streamResp.text();

    const srcMatch = streamHtml.match(/<source\s+src="([^"]+)"/);
    if (!srcMatch) {
      throw new Error('Could not find <source> tag in stream page');
    }
    const videoUrl = srcMatch[1];

    // Build filename.
    let filename = title || extractIdFromUrl(pageUrl);
    const videoExts = ['.mp4', '.m3u8', '.webm', '.mkv', '.ts', '.mov'];
    const hasExt = videoExts.some(ext => filename.toLowerCase().endsWith(ext));
    if (hasExt) {
      const ext = videoExts.find(e => filename.toLowerCase().endsWith(e))!;
      filename = filename.slice(0, -ext.length);
    }
    filename += '.mp4';

    return { videoUrls: [videoUrl], filename };
  }
}
