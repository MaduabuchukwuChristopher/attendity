import clsx from 'clsx';
import type { ReactNode } from 'react';

export type IdentifierBadgeTone = 'green' | 'teal' | 'blue' | 'gold' | 'rose' | 'violet' | 'navy';

const toneClasses: Record<IdentifierBadgeTone, string> = {
  green:
    'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  teal: 'border-teal-200 bg-teal-100 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200',
  blue: 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
  gold: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  rose: 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200',
  violet:
    'border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200',
  navy: 'border-slate-300 bg-slate-100 text-university-navy dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
};

export function IdentifierBadge({
  children,
  className,
  tone = 'navy',
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly tone?: IdentifierBadgeTone;
}) {
  return (
    <span
      className={clsx(
        'inline-flex max-w-full items-center rounded-lg border px-2.5 py-1 font-mono text-xs font-bold tracking-wide',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
