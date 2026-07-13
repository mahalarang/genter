import type { FileWriter } from './file-writer.js';

/**
 * Options for the download function.
 */
export interface DownloadOptions {
  /** Direct CDN video URL to download. */
  videoUrl: string;

  /** Referer header required by the CDN. */
  referer: string;

  /** Factory function that creates a FileWriter for the download. */
  createWriter: () => Promise<FileWriter>;

  /** Called periodically with download progress (downloaded bytes, total bytes). */
  onProgress?: (downloaded: number, total: number) => void;

  /** AbortSignal to cancel the download. */
  signal?: AbortSignal;
}

/**
 * Downloads a video from a CDN URL to the provided FileWriter.
 *
 * Uses a single sequential HTTP GET with streaming. If the server
 * supports Range requests, we use them for a clean byte-stream.
 *
 * @throws {Error} on HTTP errors, network failures, or abort.
 */
export async function download(opts: DownloadOptions): Promise<void> {
  const { videoUrl, referer, createWriter, onProgress, signal } = opts;

  // Step 1: Probe the server to get Content-Length.
  const totalBytes = await probeContentLength(videoUrl, referer, signal);

  // Step 2: Create the writer.
  const writer = await createWriter();

  // Step 3: Stream the download.
  const response = await fetch(videoUrl, {
    headers: {
      Referer: referer,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Range: 'bytes=0-',
    },
    signal,
  });

  if (!response.ok && response.status !== 206) {
    await writer.close();
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    await writer.close();
    throw new Error('No response body');
  }

  let downloaded = 0;
  const progressInterval = 250; // ms between progress calls
  let lastProgressTime = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      await writer.write(value);
      downloaded += value.byteLength;

      // Throttle progress callbacks.
      const now = Date.now();
      if (onProgress && now - lastProgressTime >= progressInterval) {
        onProgress(downloaded, totalBytes);
        lastProgressTime = now;
      }
    }
  } finally {
    reader.releaseLock();
    await writer.close();
  }

  // Final progress.
  onProgress?.(downloaded, totalBytes);
}

/**
 * Sends a HEAD request to get the Content-Length of the video.
 */
async function probeContentLength(
  url: string,
  referer: string,
  signal?: AbortSignal
): Promise<number> {
  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      Referer: referer,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to probe video: ${response.status} ${response.statusText}`
    );
  }

  const contentLength = response.headers.get('Content-Length');
  if (!contentLength) {
    throw new Error('Server did not provide Content-Length');
  }

  const size = parseInt(contentLength, 10);
  if (isNaN(size)) {
    throw new Error(`Invalid Content-Length: ${contentLength}`);
  }

  return size;
}
