import { YtDlp } from "ytdlp-nodejs";
import type { VideoInfo, PlaylistInfo, ArgsOptions } from "ytdlp-nodejs";
import type { Extractor, ExtractResult } from "../extractor.js";

/**
 * Auth options for Twitter/X extraction.
 */
export interface TwitterAuth {
  /** Path to a Netscape-format cookies file. */
  cookies?: string;
  /** Read cookies from a browser profile (e.g., 'chrome', 'firefox'). */
  cookiesFromBrowser?: string;
}

const TWITTER_DOMAINS = ["x.com", "twitter.com"];

/**
 * Generate a Netscape-format cookie string from just the two
 * essential Twitter auth cookies.
 *
 * How to get these tokens:
 *   1. Open x.com → F12 → Application → Cookies → x.com
 *   2. Copy the value of `auth_token`
 *   3. Copy the value of `ct0`
 *
 * Usage:
 *   const cookies = twitterCookiesFromTokens(authToken, ct0);
 */
export function twitterCookiesFromTokens(
  authToken: string,
  ct0: string,
): string {
  // Netscape cookie format:
  // domain  flag  path  secure  expiration  name  value
  const domain = ".x.com";
  const path = "/";
  const expiration = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

  return [
    [domain, "TRUE", path, "TRUE", String(expiration), "auth_token", authToken],
    [domain, "TRUE", path, "TRUE", String(expiration), "ct0", ct0],
  ]
    .map((row) => row.join("\t"))
    .join("\n");
}

/**
 * Extracts video URLs from Twitter/X tweets using yt-dlp.
 *
 * For public tweets, no auth is needed. For age-restricted tweets,
 * provide {@link TwitterAuth} via cookies.
 *
 * Quick auth:
 *   const cookies = twitterCookiesFromTokens(authToken, ct0);
 *   new TwitterExtractor({ cookies });
 */
export class TwitterExtractor implements Extractor {
  constructor(private auth?: TwitterAuth) {}

  canHandle(url: string): boolean {
    return TWITTER_DOMAINS.some((d) => url.includes(d));
  }

  async extract(pageUrl: string): Promise<ExtractResult> {
    // Pre-check: fetch the page to detect suspended/deleted tweets.
    const tweetId = extractTweetId(pageUrl);
    const username = extractUsername(pageUrl);

    try {
      const resp = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const body = await resp.text();

      if (body.includes("Something went wrong")) {
        throw new Error("This tweet has been suspended or deleted.");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("suspended")) throw err;
    }

    // Yt-dlp extraction.
    const ytdlp = new YtDlp();
    const opts: ArgsOptions = {};

    if (this.auth?.cookies) {
      opts.cookies = this.auth.cookies;
    }
    if (this.auth?.cookiesFromBrowser) {
      opts.cookiesFromBrowser = this.auth.cookiesFromBrowser;
    }

    // Try getInfoAsync first — handles multi-video tweets as playlists.
    const info = await ytdlp.getInfoAsync<"playlist">(pageUrl, opts);

    // Multi-video tweet: PlaylistInfo with entries.
    if (info._type === "playlist" && info.entries && info.entries.length > 0) {
      const urls: string[] = [];
      const filenames: string[] = [];

      for (const entry of info.entries) {
        // Extract HLS video URL from requested_downloads or formats.
        const dl = entry.requested_downloads?.[0] as Record<string, unknown> | undefined;
        const requestedFormats = dl?.requested_formats as Array<Record<string, unknown>> | undefined;
        const videoFormat = requestedFormats?.[0] || entry.formats?.[0];
        if (videoFormat?.url) {
          urls.push(videoFormat.url as string);
        }

        if (dl?.filename) {
          filenames.push(dl.filename as string);
        }
      }

      if (urls.length === 0) {
        throw new Error(
          'No video found in this tweet. It may be age-restricted, ' +
            'require login, or not contain video. ' +
            'Try: genter --twitter-auth "auth_token:ct0" <url>'
        );
      }

      return {
        videoUrls: urls,
        filename: filenames[0],
      };
    }

    // Single video tweet: use getDirectUrlsAsync.
    const urls = await ytdlp.getDirectUrlsAsync(pageUrl, opts);

    if (!urls || urls.length === 0) {
      throw new Error(
        'No video found in this tweet. It may be age-restricted, ' +
          'require login, or not contain video. ' +
          'Try: genter --twitter-auth "auth_token:ct0" <url>'
      );
    }

    // Build filename: twitter-username-tweetId.mp4
    let filename: string | undefined;
    if (tweetId && username) {
      filename = `twitter-${username}-${tweetId}.mp4`;
    } else if (tweetId) {
      filename = `twitter-${tweetId}.mp4`;
    }

    return {
      videoUrls: urls,
      filename,
    };
  }
}

/** Extract tweet ID from URL like https://x.com/user/status/123456 */
function extractTweetId(url: string): string | null {
  const m = url.match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

/** Extract username from URL like https://x.com/username/status/... */
function extractUsername(url: string): string | null {
  const m = url.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status\//);
  return m ? m[1] : null;
}
