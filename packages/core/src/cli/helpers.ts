import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

/**
 * Guess a filename from a URL. Adds .mp4 if no video extension.
 */
export function guessFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split('/').filter(Boolean).pop();
    if (last) {
      const videoExts = ['.mp4', '.m3u8', '.webm', '.mkv', '.ts', '.mov'];
      const hasExt = videoExts.some(ext => last.toLowerCase().endsWith(ext));
      return hasExt
        ? last.slice(0, -videoExts.find(e => last.toLowerCase().endsWith(e))!.length) + '.mp4'
        : last + '.mp4';
    }
  } catch {
    // not a valid URL
  }
  return 'video.mp4';
}

/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

/**
 * Guess the Referer header from a page URL.
 */
export function guessReferer(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/`;
  } catch {
    return 'https://xpvid.cc/';
  }
}

/**
 * Returns true if the URL is a Twitter/X URL.
 */
export function isTwitterUrl(url: string): boolean {
  return url.includes('x.com') || url.includes('twitter.com');
}

/**
 * Resolves the ffmpeg path.
 * Tries ffmpeg-static first, falls back to system ffmpeg.
 */
export async function resolveFfmpegPath(): Promise<string> {
  // 1. Try ffmpeg-static via dynamic import
  try {
    const ffmpeg = await import('ffmpeg-static');
    const path = (ffmpeg.default as string) || (ffmpeg as unknown as string) || '';
    if (path) {
      await stat(path);
      return path;
    }
  } catch {
    // ffmpeg-static import failed, continue
  }

  // 2. Try ffmpeg-static via require (some ESM/CJS edge cases)
  try {
    const require = createRequire(import.meta.url);
    const path: string = require('ffmpeg-static');
    if (path) {
      await stat(path);
      return path;
    }
  } catch {
    // require approach failed, continue
  }

  // 3. Try system ffmpeg
  const homebrewPaths = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
  for (const p of homebrewPaths) {
    try {
      await stat(p);
      return p;
    } catch {
      // not at this path
    }
  }

  try {
    const systemPath = execFileSync('which', ['ffmpeg'], { encoding: 'utf8' }).trim();
    if (systemPath) return systemPath;
  } catch {
    // not found
  }

  throw new Error(
    'ffmpeg not found. Install it:\n' +
    '  macOS:  brew install ffmpeg\n' +
    '  Linux:  apt install ffmpeg / dnf install ffmpeg'
  );
}
