import type { Extractor } from "../extractor.js";
import { XpvidExtractor } from "./xpvid.js";

/**
 * Registry of all available extractors.
 * Add new extractors here for new sites.
 *
 * Priority: extractors earlier in the array take precedence.
 */
const extractors: Extractor[] = [new XpvidExtractor()];

/**
 * Finds the first extractor that can handle the given URL.
 * Returns null if no extractor matches.
 *
 * Note: Twitter is handled separately in the CLI (uses yt-dlp,
 * which is Node.js-only). See TwitterExtractor.
 */
export function findExtractor(url: string): Extractor | null {
  for (const ext of extractors) {
    if (ext.canHandle(url)) {
      return ext;
    }
  }
  return null;
}
