import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';

function run(command: string, args: readonly string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'inherit', 'inherit'], shell: false });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`${command} exited with code ${String(code)}.`)),
    );
  });
}

async function backup(): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRoot = resolve(process.cwd(), 'backups');
  const destination = resolve(backupRoot, stamp);
  await mkdir(destination, { recursive: true });
  const archive = resolve(destination, 'mongodb.archive.gz');
  await run('mongodump', ['--uri', environment.MONGODB_URI, `--archive=${archive}`, '--gzip']);
  await writeFile(
    resolve(destination, 'manifest.json'),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        archive: 'mongodb.archive.gz',
        encryptedAtRestBy: 'MongoDB Atlas and backup storage provider',
      },
      null,
      2,
    ),
    'utf8',
  );
  logger.info({ destination }, 'Encrypted-at-rest database backup completed');
}

void backup().catch((error: unknown) => {
  logger.error({ error }, 'Database backup failed');
  process.exitCode = 1;
});
