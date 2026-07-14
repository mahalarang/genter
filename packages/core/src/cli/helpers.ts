import { execFileSync } from 'node:child_process';

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
 * Resolves the ffmpeg path from system installation.
 */
export async function resolveFfmpegPath(): Promise<string> {
  try {
    const systemPath = execFileSync('which', ['ffmpeg'], { encoding: 'utf8' }).trim();
    if (systemPath) return systemPath;
  } catch {
    // not found
  }

  throw new Error(
    'ffmpeg not found. Install it:\n' +
    '  macOS:  brew install ffmpeg\n' +
    '  Linux:  apt install ffmpeg / dnf install ffmpeg\n' +
    '  Windows: winget install ffmpeg / choco install ffmpeg'
  );
}
