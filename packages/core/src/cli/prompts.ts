import { resolve, join, basename, dirname as pathDirname } from 'node:path';
import { access, constants, stat } from 'node:fs/promises';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { formatBytes } from './helpers.js';

/**
 * Resolves the output path from CLI options.
 * Priority: --output > --output-dir + suggested filename > cwd + suggested filename
 */
export async function resolveOutputPath(
  output?: string,
  outputDir?: string,
  suggestedFilename?: string,
): Promise<string> {
  const filename = suggestedFilename || 'video.mp4';

  if (output) {
    return resolve(process.cwd(), output);
  }

  if (outputDir) {
    return resolve(process.cwd(), outputDir, filename);
  }

  return resolve(process.cwd(), filename);
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
