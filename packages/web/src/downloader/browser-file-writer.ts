import type { FileWriter } from '@donlod/core';

/**
 * BrowserFileWriter implements FileWriter for the browser.
 *
 * Collects all chunks in memory, then triggers a download
 * via Blob + anchor element when closed.
 */
export class BrowserFileWriter implements FileWriter {
  private chunks: Uint8Array[] = [];

  constructor(private filename: string) {}

  async write(chunk: Uint8Array): Promise<void> {
    this.chunks.push(new Uint8Array(chunk));
  }

  async close(): Promise<void> {
    const blob = new Blob(this.chunks as BlobPart[], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = this.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up after a short delay.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
