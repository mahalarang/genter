/**
 * The result of a successful extraction.
 */
export interface ExtractResult {
  /** Direct URLs to the video files (CDN). Multiple URLs for multi-video tweets. */
  videoUrls: string[];

  /**
   * Suggested output filename (without path).
   * If not provided, the CLI will generate one from the URL.
   */
  filename?: string;
}

/**
 * Extractor interface.
 *
 * Each extractor handles one streaming site. It knows how to
 * resolve a page URL into a direct CDN video URL.
 */
export interface Extractor {
  /** Returns true if this extractor can handle the given page URL. */
  canHandle(url: string): boolean;

  /**
   * Resolves a page URL into video metadata.
   * Throws if the page cannot be extracted.
   */
  extract(url: string): Promise<ExtractResult>;
}
