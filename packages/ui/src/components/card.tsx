import clsx from 'clsx';
import type { HTMLAttributes, PropsWithChildren } from 'react';
import type { SemanticTone } from './semantic-value.js';

export interface CardProps extends PropsWithChildren<
  Omit<HTMLAttributes<HTMLElement>, 'className'>
> {
  readonly className?: string;
  readonly tone?: SemanticTone | 'slate';
  readonly variant?: 'default' | 'elevated' | 'glass' | 'interactive';
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'rounded-2xl border shadow-sm',
  elevated: 'rounded-2xl border shadow-lg',
  glass: 'rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-lg shadow-black/5',
  interactive:
    'rounded-2xl border shadow-sm transition-all duration-250 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30',
};

const toneClasses: Record<NonNullable<CardProps['tone']>, string> = {
  slate: 'border-slate-200 bg-slate-100 shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900',
  green:
    'border-emerald-200 bg-emerald-100 shadow-emerald-950/5 dark:border-emerald-800 dark:bg-emerald-950',
  teal: 'border-teal-200 bg-teal-100 shadow-teal-950/5 dark:border-teal-800 dark:bg-teal-950',
  navy: 'border-blue-300 bg-blue-100 shadow-blue-950/5 dark:border-blue-800 dark:bg-blue-950',
  blue: 'border-blue-200 bg-sky-100 shadow-blue-950/5 dark:border-blue-800 dark:bg-blue-950',
  gold: 'border-amber-200 bg-amber-100 shadow-amber-950/5 dark:border-amber-800 dark:bg-amber-950',
  rose: 'border-rose-200 bg-rose-100 shadow-rose-950/5 dark:border-rose-800 dark:bg-rose-950',
  violet:
    'border-violet-200 bg-violet-100 shadow-violet-950/5 dark:border-violet-800 dark:bg-violet-950',
};

export function Card({
  children,
  className,
  tone = 'slate',
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <section
      className={clsx(
        'min-w-0 max-w-full',
        variantClasses[variant],
        variant === 'glass' ? undefined : toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
