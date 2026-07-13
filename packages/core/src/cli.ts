#!/usr/bin/env node

import { Command } from 'commander';
import ora, { type Ora } from 'ora';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { findExtractor, download } from './index.js';
import { twitterCookiesFromTokens, TwitterExtractor } from './node.js';
import { NodeFileWriter } from './node.js';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

import {
  guessFilename,
  formatBytes,
  guessReferer,
  isTwitterUrl,
  resolveFfmpegPath,
} from './cli/helpers.js';
import { resolveOutputPath, checkExistingFile } from './cli/prompts.js';

const program = new Command();

program
  .name('donlod')
  .description('Download streaming videos from supported sites')
  .argument('[url]', 'URL of the video page to download')
  .option('-o, --output <path>', 'Output file path (overrides automatic naming)')
  .option('-d, --output-dir <dir>', 'Output directory (default: current directory)')
  .option('--no-progress', 'Disable progress bar')
  .option(
    '--cookies-from-browser <browser>',
    'Read cookies from browser (chrome, firefox, edge, etc.) — for Twitter/X auth',
  )
  .option(
    '--cookies <path>',
    'Path to Netscape-format cookies file — for Twitter/X auth',
  )
  .option(
    '--twitter-auth <auth_token:ct0>',
    'Quick Twitter auth — paste auth_token and ct0 (format: auth_token:ct0).\n' +
      'Get them from: x.com → F12 → Application → Cookies → x.com',
  )
  .action(
    async (
      url: string | undefined,
      options: {
        output?: string;
        outputDir?: string;
        progress: boolean;
        cookiesFromBrowser?: string;
        cookies?: string;
        twitterAuth?: string;
      },
    ) => {
      // Show help if no URL provided.
      if (!url) {
        program.outputHelp();
        process.exit(0);
      }

      let spinner: Ora | null = null;
      let bar: cliProgress.SingleBar | null = null;
      let barStarted = false;
      let tempCookiesFile: string | null = null;

      try {
        // Step 1: Find extractor — build auth options.
        let cookiesFile = options.cookies;

        // Convert simple --twitter-auth into a temp Netscape cookies file.
        if (options.twitterAuth) {
          const parts = options.twitterAuth.split(':');
          if (parts.length !== 2) {
            console.error(
              '--twitter-auth format: auth_token:ct0 (separated by colon)',
            );
            process.exit(1);
          }

          const content = twitterCookiesFromTokens(parts[0], parts[1]);
          tempCookiesFile = join(
            tmpdir(),
            `donlod-twitter-cookies-${randomBytes(6).toString('hex')}.txt`,
          );
          await writeFile(tempCookiesFile, content, 'utf-8');
          cookiesFile = tempCookiesFile;
        }

        spinner = ora('Detecting site...').start();

        // Resolve extractor.
        // Twitter uses yt-dlp (Node.js only), handled separately.
        let extractor = findExtractor(url);
        if (!extractor && isTwitterUrl(url)) {
          extractor = new TwitterExtractor({
            cookiesFromBrowser: options.cookiesFromBrowser,
            cookies: cookiesFile,
          });
        }
        if (!extractor) {
          spinner.fail('No extractor found for this URL.');
          process.exit(1);
        }

        spinner.text = 'Extracting video URL...';

        // Step 2: Extract.
        const result = await extractor.extract(url);
        const videoUrl = result.videoUrl;
        const suggestedFilename = result.filename;

        spinner.succeed('Video URL found.');

        // Step 3: Confirm output filename.
        let outputPath = await resolveOutputPath(
          options.output,
          options.outputDir,
          suggestedFilename || guessFilename(url),
        );

        // Check if file already exists.
        outputPath = await checkExistingFile(outputPath);

        // HLS playlist detected — use yt-dlp to download & merge segments.
        if (videoUrl.endsWith('.m3u8') || videoUrl.endsWith('.m3u')) {
          // Reuse the existing spinner instance to avoid ora's concurrent-spinner warning.
          spinner.stop();
          spinner.text = 'Downloading HLS stream...';
          spinner.start();

          const { YtDlp } = await import('ytdlp-nodejs');
          const ytdlp = new YtDlp({
            ffmpegPath: await resolveFfmpegPath(),
          });
          const streamOpts: Record<string, unknown> = {};

          if (options.cookiesFromBrowser) {
            streamOpts.cookiesFromBrowser = options.cookiesFromBrowser;
          }
          if (cookiesFile) {
            streamOpts.cookies = cookiesFile;
          }

          // For Twitter, use the original tweet URL so yt-dlp can handle auth + merge.
          // For other sites (xpvid.cc), stream the raw .m3u8 URL directly.
          const streamUrl = isTwitterUrl(url) ? url : videoUrl;
          const { createWriteStream } = await import('node:fs');
          const ws = createWriteStream(outputPath);
          const stream = ytdlp.stream(streamUrl, streamOpts);

          if (isTwitterUrl(url)) {
            await stream
              .filter('mergevideo')
              .quality('highest')
              .type('mp4')
              .embedThumbnail()
              .pipeAsync(ws);
          } else {
            await stream.pipeAsync(ws);
          }

          spinner.succeed('HLS download complete.');
          console.log(chalk.green(`\nDownload complete: ${outputPath}`));
          return;
        }

        // Standard single-file download — use our downloader.
        const writer = new NodeFileWriter(outputPath);
        const referer = guessReferer(url);

      // Prepare progress bar (started lazily on first progress callback).
      if (options.progress !== false) {
        bar = new cliProgress.SingleBar({
          format:
            'Downloading [{bar}] {percentage}% | {downloaded_fmt} / {total_fmt}',
          barCompleteChar: '=',
          barIncompleteChar: ' ',
          hideCursor: true,
          fps: 10,
          stream: process.stderr,
          noTTYOutput: true,
          notTTYSchedule: 1000,
        });
      }

      // Newline so progress bar gets its own line.
      process.stderr.write('\n');

      await download({
        videoUrl,
        referer,
        createWriter: async () => writer,
        onProgress: (downloaded, total) => {
          if (!bar) return;

          if (!barStarted) {
            bar.start(total, 0, {
              downloaded_fmt: formatBytes(0),
              total_fmt: formatBytes(total),
            });
            barStarted = true;
          }

          bar.update(downloaded, {
            downloaded_fmt: formatBytes(downloaded),
            total_fmt: formatBytes(total),
          });
        },
      });

      if (bar && barStarted) {
        bar.stop();
        process.stderr.write('\n');
      }

      // Wait for rename to complete.
      await writer.closed();

      console.log(`\nDownload complete: ${outputPath}`);
    } catch (err) {
      if (spinner) spinner.fail(String(err));
      else console.error(chalk.red(String(err)));
      process.exit(1);
    } finally {
      // Clean up temp cookies file.
      if (tempCookiesFile) {
        await unlink(tempCookiesFile).catch(() => {});
      }
    }
  });

program.parse();
