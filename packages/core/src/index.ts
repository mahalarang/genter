// @genter/core — video downloader core library (browser-safe)
//
// For Node.js-specific exports (NodeFileWriter, TwitterExtractor),
// import from '@genter/core/node'.

export { VERSION } from './version.js';
export type { Extractor, ExtractResult } from './extractor.js';
export { findExtractor } from './extractors/registry.js';
export { XpvidExtractor } from './extractors/xpvid.js';
export type { FileWriter } from './downloader/file-writer.js';
export type { DownloadOptions } from './downloader/downloader.js';
export { download } from './downloader/downloader.js';
