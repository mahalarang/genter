import { createWriteStream } from 'node:fs';
import { mkdir, rename, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Writable } from 'node:stream';
import type { FileWriter } from './file-writer.js';

/**
 * NodeFileWriter implements FileWriter using Node.js `fs.createWriteStream`.
 *
 * It writes to a temporary `.part` file during download,
 * then renames to the final path on close.
 */
export class NodeFileWriter implements FileWriter {
  private stream: Writable | null = null;
  private readonly partPath: string;
  private readonly finalPath: string;
  private resolveClose: (() => void) | null = null;
  private closePromise: Promise<void>;

  constructor(outputPath: string) {
    this.finalPath = outputPath;
    this.partPath = outputPath + '.part';

    // Create a promise that resolves when the stream finishes.
    this.closePromise = new Promise<void>((resolve) => {
      this.resolveClose = resolve;
    });
  }

  async write(chunk: Uint8Array): Promise<void> {
    // Lazy-init the stream on first write.
    if (!this.stream) {
      await this.ensureDir();
      this.stream = createWriteStream(this.partPath, { flags: 'w' });

      this.stream.on('error', (err) => {
        // Propagate stream errors — the downloader will catch this
        // on the next write/close.
        console.error('Write stream error:', err);
      });
    }

    return new Promise<void>((resolve, reject) => {
      const drained = this.stream!.write(chunk, (err) => {
        if (err) reject(err);
      });

      if (drained) {
        resolve();
      } else {
        this.stream!.once('drain', resolve);
      }
    });
  }

  async close(): Promise<void> {
    if (!this.stream) {
      // No data was written — nothing to close.
      this.resolveClose?.();
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.stream!.end(() => {
        // Rename .part → final.
        rename(this.partPath, this.finalPath)
          .then(() => {
            this.resolveClose?.();
            resolve();
          })
          .catch(reject);
      });

      this.stream!.on('error', reject);
    });
  }

  /** Returns a promise that resolves when the writer is fully closed. */
  closed(): Promise<void> {
    return this.closePromise;
  }

  private async ensureDir(): Promise<void> {
    const dir = dirname(this.finalPath);
    await mkdir(dir, { recursive: true });
  }
}
