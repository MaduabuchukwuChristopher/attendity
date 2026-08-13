import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';

async function restore(): Promise<void> {
  if (process.env.ALLOW_DATABASE_RESTORE !== 'true')
    throw new Error(
      'Set ALLOW_DATABASE_RESTORE=true to confirm the destructive restore operation.',
    );
  if (!process.env.RESTORE_ARCHIVE)
    throw new Error('RESTORE_ARCHIVE must identify a backup archive.');
  const backupRoot = resolve(process.cwd(), 'backups');
  const archive = resolve(process.env.RESTORE_ARCHIVE);
  const relativePath = relative(backupRoot, archive);
  if (relativePath.startsWith('..') || relativePath === '')
    throw new Error('RESTORE_ARCHIVE must be a file inside the repository backups directory.');
  await access(archive);
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(
      'mongorestore',
      ['--uri', environment.MONGODB_URI, `--archive=${archive}`, '--gzip', '--drop'],
      { stdio: ['ignore', 'inherit', 'inherit'], shell: false },
    );
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`mongorestore exited with code ${String(code)}.`)),
    );
  });
  logger.info({ archive }, 'Database restore completed');
}

void restore().catch((error: unknown) => {
  logger.error({ error }, 'Database restore failed');
  process.exitCode = 1;
});
