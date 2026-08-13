import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const outputDirectory = resolve(process.cwd(), '.test-dist/button-colours');
let compiledCss = '';

beforeAll(() => {
  const viteEntry = resolve(process.cwd(), '../../node_modules/vite/bin/vite.js');
  execFileSync(
    process.execPath,
    [viteEntry, 'build', '--configLoader', 'runner', '--outDir', outputDirectory, '--emptyOutDir'],
    { cwd: process.cwd(), stdio: 'pipe' },
  );

  const assetDirectory = resolve(outputDirectory, 'assets');
  const stylesheet = readdirSync(assetDirectory).find((file) => file.endsWith('.css'));
  if (!stylesheet) throw new Error('The landing build did not produce a stylesheet.');
  compiledCss = readFileSync(resolve(assetDirectory, stylesheet), 'utf8');
}, 120_000);

describe('landing production button colours', () => {
  it('includes the shared primary button colour in the compiled stylesheet', () => {
    expect(compiledCss).toContain('.bg-primary{background-color:var(--color-primary)}');
  });

  it('includes the shared secondary button surface in the compiled stylesheet', () => {
    expect(compiledCss).toContain('.bg-surface{background-color:var(--color-surface)}');
  });

  it('includes the prominent mobile institution sign-in treatment', () => {
    expect(compiledCss).toContain('.mobile-portal-button{');
    expect(compiledCss).toContain('background:#0b2638');
    expect(compiledCss).toContain('min-height:3.25rem');
  });
});
