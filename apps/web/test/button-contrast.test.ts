import { describe, expect, it } from 'vitest';
import { buttonClassName } from '@qr/ui';

describe('dashboard button contrast', () => {
  it('keeps primary button labels white in dark mode', () => {
    expect(buttonClassName('primary')).toContain('dark:text-white');
  });

  it('gives secondary buttons an explicit dark surface and readable label', () => {
    const classes = buttonClassName('secondary');

    expect(classes).toContain('dark:bg-dark-surface');
    expect(classes).toContain('dark:text-slate-100');
  });

  it('keeps outline button labels visible against dark surfaces', () => {
    const classes = buttonClassName('outline');

    expect(classes).toContain('dark:border-emerald-400');
    expect(classes).toContain('dark:text-emerald-300');
  });

  it.each([
    ['download', 'bg-blue-600', 'text-white', 'dark:bg-blue-500', 'dark:text-white', 'blue'],
    ['print', 'bg-violet-600', 'text-white', 'dark:bg-violet-500', 'dark:text-white', 'violet'],
    ['excel', 'bg-emerald-600', 'text-white', 'dark:bg-emerald-500', 'dark:text-white', 'emerald'],
    ['csv', 'bg-amber-400', 'text-amber-950', 'dark:bg-amber-400', 'dark:text-amber-950', 'amber'],
    ['share', 'bg-cyan-400', 'text-cyan-950', 'dark:bg-cyan-400', 'dark:text-cyan-950', 'cyan'],
    ['image', 'bg-rose-600', 'text-white', 'dark:bg-rose-500', 'dark:text-white', 'rose'],
  ] as const)(
    'gives the %s action a solid accessible semantic treatment',
    (variant, background, foreground, darkBackground, darkForeground, ring) => {
      const classes = buttonClassName(variant);

      expect(classes).toContain(background);
      expect(classes).toContain(foreground);
      expect(classes).toContain(darkBackground);
      expect(classes).toContain(darkForeground);
      expect(classes).toContain(`focus-visible:ring-${ring}`);
      expect(classes).toContain('shadow-lg');
    },
  );
});
