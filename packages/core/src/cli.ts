#!/usr/bin/env node

import { Command } from "commander";
import ora, { type Ora } from "ora";
import cliProgress from "cli-progress";
import chalk from "chalk";
import { findExtractor, download } from "./index.js";
import { twitterCookiesFromTokens, TwitterExtractor } from "./node.js";
import { NodeFileWriter } from "./node.js";
import { writeFile, unlink } from "node:fs/promises";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import {
  guessFilename,
  formatBytes,
  guessReferer,
  isTwitterUrl,
  resolveFfmpegPath,
} from "./cli/helpers.js";
import { resolveOutputPath, checkExistingFile } from "./cli/prompts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);
const VERSION: string = pkg.version;

const program = new Command();

program
  .name("genter")
  .description("Download streaming videos from supported sites")
  .argument("[url]", "URL of the video page to download")
  .option(
    "-o, --output <path>",
    "Output file path (overrides automatic naming)",
  )
  .option(
    "-d, --output-dir <dir>",
    "Output directory (default: current directory)",
  )
  .option("--no-progress", "Disable progress bar")
  .option(
    "--cookies-from-browser <browser>",
    "Read cookies from browser (chrome, firefox, edge, etc.) — for Twitter/X auth",
  )
  .option(
    "--cookies <path>",
    "Path to Netscape-format cookies file — for Twitter/X auth",
  )
  .option(
    "--twitter-auth <auth_token:ct0>",
    "Quick Twitter auth — paste auth_token and ct0 (format: auth_token:ct0).\n" +
      "Get them from: x.com → F12 → Application → Cookies → x.com",
  )
  .addHelpText("beforeAll", () => {
    const figlet = createRequire(import.meta.url)("figlet") as {
      textSync: (text: string, opts?: { font?: string }) => string;
    };
    const logo = figlet.textSync("GENTER", { font: "Standard" });
    const lines = logo.split("\n").filter((l) => l.trim());
    const width = 52;
    const pad = (s: string, w: number) =>
      s + " ".repeat(Math.max(0, w - s.length));
    const banner = [
      `  ${chalk.cyan.bold("╔" + "═".repeat(width) + "╗")}`,
      `  ${chalk.cyan.bold("║ " + " ".repeat(width) + " ║")}`,
      ...lines.map(
        (l) =>
          `  ${chalk.cyan.bold("║")} ${chalk.yellow.bold(pad(l, width))} ${chalk.cyan.bold("║")}`,
      ),
      `  ${chalk.cyan.bold("║ " + " ".repeat(width) + " ║")}`,
      `  ${chalk.cyan.bold("║")} ${chalk.dim(pad("Download videos from the command line", width))} ${chalk.cyan.bold("║")}`,
      `  ${chalk.cyan.bold("║")} ${chalk.dim(pad("v" + VERSION, width))} ${chalk.cyan.bold("║")}`,
      `  ${chalk.cyan.bold("╚" + "═".repeat(width) + "╝")}`,
      ``,
    ].join("\n");
    return banner;
  })
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

      // Check ffmpeg is installed.
      let ffmpegPath: string;
      try {
        ffmpegPath = await resolveFfmpegPath();
      } catch {
        console.log(chalk.yellow("⚠️  ffmpeg not found."));
        console.log(chalk.dim("   Install it first:"));
        console.log(chalk.dim("   macOS:  brew install ffmpeg"));
        console.log(chalk.dim("   Linux:  sudo apt install ffmpeg"));
        console.log(chalk.dim("   Windows: winget install ffmpeg"));
        process.exit(1);
      }

      let tempCookiesFile: string | null = null;

      try {
        // Step 1: Find extractor — build auth options.
        let cookiesFile = options.cookies;

        // Convert simple --twitter-auth into a temp Netscape cookies file.
        if (options.twitterAuth) {
          const parts = options.twitterAuth.split(":");
          if (parts.length !== 2) {
            console.error(
              "--twitter-auth format: auth_token:ct0 (separated by colon)",
            );
            process.exit(1);
          }

          const content = twitterCookiesFromTokens(parts[0], parts[1]);
          tempCookiesFile = join(
            tmpdir(),
            `donlod-twitter-cookies-${randomBytes(6).toString("hex")}.txt`,
          );
          await writeFile(tempCookiesFile, content, "utf-8");
          cookiesFile = tempCookiesFile;
        }

        const spinner = ora("Detecting site...").start();

        // Resolve extractor.
        let extractor = findExtractor(url);
        if (!extractor && isTwitterUrl(url)) {
          extractor = new TwitterExtractor({
            cookiesFromBrowser: options.cookiesFromBrowser,
            cookies: cookiesFile,
          });
        }
        if (!extractor) {
          spinner.fail("No extractor found for this URL.");
          process.exit(1);
        }

        spinner.text = "Extracting video URL...";

        // Step 2: Extract.
        const result = await extractor.extract(url);
        const videoUrls = result?.videoUrls;
        const suggestedFilename = result?.filename;

        if (!videoUrls || videoUrls.length === 0) {
          throw new Error(
            "No video found. The tweet may require login or not contain video.\n" +
              '  Try: genter --twitter-auth "auth_token:ct0" <url>',
          );
        }

        spinner.succeed(`${videoUrls.length} video(s) found.`);

        // Step 3: Select which videos to download.
        let selectedUrls: string[];
        if (videoUrls.length > 1) {
          const { default: checkbox } = await import("@inquirer/checkbox");
          const choices = videoUrls.map((_, i) => {
            const label = videoUrls.length > 1 ? `Video ${i + 1}` : `Video`;
            return { name: label, value: i };
          });
          const selected = await checkbox({
            message:
              "Select videos to download (space to select, enter to confirm):",
            choices,
          });
          if (!selected || selected.length === 0) {
            console.log(chalk.yellow("No video selected. Cancelled."));
            process.exit(0);
          }
          selectedUrls = selected.map((i: number) => videoUrls[i]);
        } else {
          selectedUrls = videoUrls;
        }

        // Step 4: Download each selected video sequentially.
        const isTwitter = isTwitterUrl(url);
        const multi = selectedUrls.length > 1;

        for (let i = 0; i < selectedUrls.length; i++) {
          const videoUrl = selectedUrls[i];

          // Build filename.
          let filename: string;
          if (multi) {
            const baseName = suggestedFilename || guessFilename(url);
            const dotIdx = baseName.lastIndexOf(".");
            if (dotIdx > 0) {
              filename = baseName.slice(0, dotIdx) + `-${i + 1}` + baseName.slice(dotIdx);
            } else {
              filename = `${baseName}-${i + 1}.mp4`;
            }
          } else {
            filename = suggestedFilename || guessFilename(url);
          }

          // Resolve output path with user prompts.
          let outputPath = await resolveOutputPath(
            options.output,
            options.outputDir,
            filename,
          );
          outputPath = await checkExistingFile(outputPath);

          // Ensure output directory exists.
          const outDir = dirname(outputPath);
          if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

          // Download.
          const status = multi ? `[${i + 1}/${selectedUrls.length}] ` : "";
          const spinner2 = multi ? ora(`${status}Downloading video ${i + 1}...`).start() : null;

          try {
            if (!multi && options.progress !== false) {
              // Single video: progress bar.
              const bar = new cliProgress.SingleBar({
                format: "Downloading [{bar}] {percentage}% | {downloaded_fmt} / {total_fmt}",
                barCompleteChar: "=",
                barIncompleteChar: " ",
                hideCursor: true,
                fps: 10,
                stream: process.stderr,
                noTTYOutput: true,
                notTTYSchedule: 1000,
              });
              let barStarted = false;
              process.stderr.write("\n");

              await downloadOne(videoUrl, outputPath, {
                ffmpegPath,
                cookiesFile,
                cookiesFromBrowser: options.cookiesFromBrowser,
                isTwitter,
                url,
              }, (downloaded, total) => {
                if (!barStarted) {
                  bar.start(total, 0, { downloaded_fmt: formatBytes(0), total_fmt: formatBytes(total) });
                  barStarted = true;
                }
                bar.update(downloaded, { downloaded_fmt: formatBytes(downloaded), total_fmt: formatBytes(total) });
              });

              if (barStarted) { bar.stop(); process.stderr.write("\n"); }
              console.log(chalk.green(`\nDownload complete: ${outputPath}`));
            } else {
              // Multi-video or no progress: just download.
              await downloadOne(videoUrl, outputPath, {
                ffmpegPath,
                cookiesFile,
                cookiesFromBrowser: options.cookiesFromBrowser,
                isTwitter,
                url,
              });

              if (multi) {
                spinner2!.succeed(`${status}Done: ${outputPath}`);
              } else {
                console.log(chalk.green(`\nDownload complete: ${outputPath}`));
              }
            }
          } catch (err) {
            if (multi) {
              spinner2!.fail(`${status}Failed: ${err}`);
            } else {
              throw err;
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`\n${msg}`));
        process.exit(1);
      } finally {
        if (tempCookiesFile) {
          await unlink(tempCookiesFile).catch(() => {});
        }
      }
    },
  );

interface DownloadOpts {
  ffmpegPath: string;
  cookiesFile?: string;
  cookiesFromBrowser?: string;
  isTwitter: boolean;
  url: string;
}

async function downloadOne(
  videoUrl: string,
  outputPath: string,
  opts: DownloadOpts,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<void> {
  const { ffmpegPath, cookiesFile, cookiesFromBrowser, isTwitter, url } = opts;

  // HLS download for Twitter.
  if (isTwitter && (videoUrl.endsWith(".m3u8") || videoUrl.endsWith(".m3u"))) {
    const { YtDlp } = await import("ytdlp-nodejs");
    const ytdlp = new YtDlp({ ffmpegPath });
    const streamOpts: Record<string, unknown> = {};
    if (cookiesFromBrowser) streamOpts.cookiesFromBrowser = cookiesFromBrowser;
    if (cookiesFile) streamOpts.cookies = cookiesFile;

    const { createWriteStream } = await import("node:fs");
    const ws = createWriteStream(outputPath);
    const origCwd = process.cwd();
    process.chdir(dirname(outputPath));
    try {
      await ytdlp
        .stream(url, streamOpts)
        .filter("mergevideo")
        .quality("highest")
        .type("mp4")
        .embedThumbnail()
        .pipeAsync(ws);
    } finally {
      process.chdir(origCwd);
    }
    return;
  }

  // HLS download for non-Twitter.
  if (!isTwitter && (videoUrl.endsWith(".m3u8") || videoUrl.endsWith(".m3u"))) {
    const { spawn } = await import("node:child_process");
    const referer = guessReferer(url);
    const ffHeaders =
      `Referer: ${referer}\r\n` +
      "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n";

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn(
        ffmpegPath,
        [
          "-y", "-hide_banner", "-loglevel", "error",
          "-headers", ffHeaders,
          "-i", videoUrl,
          "-c", "copy",
          "-bsf:a", "aac_adtstoasc",
          "-f", "mp4",
          "-movflags", "frag_keyframe+empty_moov",
          outputPath,
        ],
        { stdio: ["ignore", "ignore", "pipe"], cwd: dirname(outputPath) },
      );

      let stderr = "";
      ffmpeg.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
      ffmpeg.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg: ${stderr.trim() || `exited with code ${code}`}`));
      });
      ffmpeg.on("error", reject);
    });
    return;
  }

  // Direct download.
  const writer = new NodeFileWriter(outputPath);
  const referer = guessReferer(url);

  await download({
    videoUrl,
    referer,
    createWriter: async () => writer,
    onProgress: onProgress || (() => {}),
  });

  await writer.closed();
}

program.parse();
