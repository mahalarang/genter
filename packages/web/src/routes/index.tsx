import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useCallback } from 'react';
import { findExtractor, download } from '@donlod/core';
import { BrowserFileWriter } from '../downloader/browser-file-writer';
import { ClipboardPaste } from 'lucide-react';

type Status = 'idle' | 'extracting' | 'downloading' | 'done' | 'error';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState('0 B');
  const [total, setTotal] = useState('');
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const handleDownload = useCallback(async () => {
    if (!url.trim()) return;

    setStatus('extracting');
    setError('');
    setProgress(0);

    try {
      // Step 1: Find extractor.
      const extractor = findExtractor(url.trim());
      if (!extractor) {
        const isTwitter = url.includes('x.com') || url.includes('twitter.com');
        setError(
          isTwitter
            ? 'Twitter/X videos require yt-dlp (Node.js only).\nUse the CLI: donlod "' + url.trim() + '"'
            : 'No extractor found for this URL. Supported sites: xpvid.cc, vidbl.ing.'
        );
        setStatus('error');
        return;
      }

      // Step 2: Extract.
      const result = await extractor.extract(url.trim());
      const videoUrl = result.videoUrl;
      const suggestedName = result.filename || guessFilename(url);
      setFilename(suggestedName);

      setStatus('downloading');
      setDownloaded('0 B');

      const controller = new AbortController();
      abortRef.current = controller;

      const writer = new BrowserFileWriter(suggestedName);

      // Determine referer from the URL.
      const referer = guessReferer(url);

      await download({
        videoUrl,
        referer,
        createWriter: async () => writer,
        signal: controller.signal,
        onProgress: (d, t) => {
          const pct = t > 0 ? Math.round((d / t) * 100) : 0;
          setProgress(pct);
          setDownloaded(formatBytes(d));
          setTotal(formatBytes(t));
        },
      });

      setStatus('done');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setError(String(err));
      setStatus('error');
    } finally {
      abortRef.current = null;
    }
  }, [url]);

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleReset = () => {
    setStatus('idle');
    setUrl('');
    setProgress(0);
    setError('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // Clipboard access denied — silently ignore.
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* URL Input */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">
          Paste video URL
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
              placeholder="https://xpvid.cc/e/..."
              disabled={status === 'downloading' || status === 'extracting'}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-4 pr-10 py-3 text-white
                         placeholder:text-zinc-500 focus:outline-none focus:border-pink-500
                         disabled:opacity-50 transition-colors"
            />
            <button
              onClick={handlePaste}
              disabled={status === 'downloading' || status === 'extracting'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md
                         text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800
                         disabled:opacity-50 transition-colors cursor-pointer"
              title="Paste from clipboard"
            >
              <ClipboardPaste size={18} />
            </button>
          </div>
          {status === 'idle' || status === 'error' ? (
            <button
              onClick={handleDownload}
              disabled={!url.trim()}
              className="bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-700 disabled:text-zinc-500
                         text-white font-medium px-6 py-3 rounded-lg transition-colors cursor-pointer
                         disabled:cursor-not-allowed"
            >
              Download
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-medium px-6 py-3
                         rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Status */}
      {status === 'extracting' && (
        <div className="text-center text-zinc-400 py-8">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-zinc-600 border-t-pink-500 rounded-full mb-3" />
          <p>Extracting video URL...</p>
        </div>
      )}

      {status === 'downloading' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <p className="text-sm text-zinc-400 mb-3">Saving as: {filename}</p>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800 rounded-full h-3 mb-3 overflow-hidden">
            <div
              className="bg-pink-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-sm text-zinc-400">
            <span>{downloaded}</span>
            <span>{total}</span>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-6 text-center">
          <p className="text-emerald-400 font-medium text-lg mb-2">
            Download complete!
          </p>
          <p className="text-zinc-400 text-sm mb-4">{filename}</p>
          <button
            onClick={handleReset}
            className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-lg
                       transition-colors cursor-pointer"
          >
            Download another
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-6">
          <p className="text-red-400 font-medium mb-2">Error</p>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <button
            onClick={handleReset}
            className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-lg
                       transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

// --- helpers (mirror CLI) ---

function guessFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split('/').filter(Boolean).pop();
    if (last) return last + '.mp4';
  } catch {
    // not a valid URL
  }
  return 'video.mp4';
}

function guessReferer(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/`;
  } catch {
    return 'https://xpvid.cc/';
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}
