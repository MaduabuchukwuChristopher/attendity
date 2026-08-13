import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Attendity visual-system compliance', () => {
  it('does not define prohibited gradient backgrounds', () => {
    const landingStyles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    const sharedButtons = readFileSync(
      resolve(process.cwd(), '../../packages/ui/src/components/button.tsx'),
      'utf8',
    );

    expect(`${landingStyles}\n${sharedButtons}`).not.toMatch(
      /(?:linear-gradient|radial-gradient|bg-gradient)/,
    );
  });
});
