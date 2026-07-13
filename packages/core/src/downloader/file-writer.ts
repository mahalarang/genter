/**
 * FileWriter is an abstraction over writing downloaded bytes.
 *
 * The downloader calls write() sequentially with each chunk,
 * then close() when complete. This lets us swap between Node
 * file streams and browser Blob-based saving.
 */
export interface FileWriter {
  /** Write a chunk of data. Called in order, never concurrent. */
  write(chunk: Uint8Array): Promise<void>;

  /** Close the writer. Called after all chunks are written. */
  close(): Promise<void>;
}
