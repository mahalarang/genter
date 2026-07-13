import { resolve, join, basename, dirname as pathDirname } from 'node:path';
import { access, constants, stat } from 'node:fs/promises';
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { formatBytes } from './helpers.js';

/**
 * Resolves the output path from CLI options.
 * Priority: --output > --output-dir + suggested filename > cwd + suggested filename.
 * If no --output is given, prompts the user for filename.
 */
export async function resolveOutputPath(
  output?: string,
  outputDir?: string,
  suggestedFilename?: string,
): Promise<string> {
  if (output) {
    return resolve(process.cwd(), output);
  }

  const defaultName = suggestedFilename || 'video.mp4';

  const name = await input({
    message: 'Output filename:',
    default: defaultName,
  });

  // Normalize: strip existing video extension, re-add .mp4.
  const videoExts = ['.mp4', '.m3u8', '.webm', '.mkv', '.ts', '.mov'];
  const hasExt = videoExts.some(ext => name.toLowerCase().endsWith(ext));
  const finalName = hasExt
    ? name.slice(0, -videoExts.find(e => name.toLowerCase().endsWith(e))!.length) + '.mp4'
    : name + '.mp4';

  if (outputDir) {
    return resolve(process.cwd(), outputDir, finalName);
  }

  return resolve(process.cwd(), finalName);
}

/**
 * Checks if the output file already exists. If so, prompts the user
 * for action (overwrite / rename / cancel). Returns the final path.
 */
export async function checkExistingFile(outputPath: string): Promise<string> {
  try {
    await access(outputPath, constants.F_OK);
  } catch {
    // File doesn't exist — no conflict.
    return outputPath;
  }

  // File exists — prompt.
  const fileStats = await stat(outputPath);
  const size = formatBytes(fileStats.size);
  const dir = pathDirname(outputPath);
  const name = basename(outputPath);

  console.log(
    chalk.yellow(`\n⚠ File already exists: ${name} (${size})`),
  );

  const action = await select({
    message: 'What do you want to do?',
    choices: [
      { name: `Overwrite — replace ${name}`, value: 'overwrite' },
      { name: 'Rename — save with a different name', value: 'rename' },
      { name: 'Cancel — skip this download', value: 'cancel' },
    ],
  });

  if (action === 'overwrite') {
    return outputPath;
  }

  if (action === 'rename') {
    const newName = await input({
      message: 'Enter new filename:',
      default: name.replace(/(\.\w+)$/, '-1$1'),
    });
    const newPath = join(dir, newName);
    // Recursively check the new name too.
    return checkExistingFile(newPath);
  }

  // Cancel.
  console.log(chalk.gray('Download cancelled.'));
  process.exit(0);
}
