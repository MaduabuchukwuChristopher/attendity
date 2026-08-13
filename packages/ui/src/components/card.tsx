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
  slate:
    'border-slate-200 bg-gradient-to-br from-slate-100 via-blue-50 to-emerald-100 shadow-slate-900/5 dark:border-slate-700 dark:from-slate-900 dark:via-blue-950 dark:to-emerald-950',
  green:
    'border-emerald-200 bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-100 shadow-emerald-950/5 dark:border-emerald-800 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-950',
  teal: 'border-teal-200 bg-gradient-to-br from-teal-100 via-cyan-50 to-blue-100 shadow-teal-950/5 dark:border-teal-800 dark:from-teal-950 dark:via-cyan-950 dark:to-slate-950',
  navy: 'border-blue-300 bg-gradient-to-br from-blue-100 via-indigo-100 to-slate-200 shadow-blue-950/5 dark:border-blue-800 dark:from-blue-950 dark:via-indigo-950 dark:to-slate-950',
  blue: 'border-blue-200 bg-gradient-to-br from-blue-100 via-cyan-50 to-sky-100 shadow-blue-950/5 dark:border-blue-800 dark:from-blue-950 dark:via-cyan-950 dark:to-slate-950',
  gold: 'border-amber-200 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 shadow-amber-950/5 dark:border-amber-800 dark:from-amber-950 dark:via-orange-950 dark:to-slate-950',
  rose: 'border-rose-200 bg-gradient-to-br from-rose-100 via-red-50 to-orange-100 shadow-rose-950/5 dark:border-rose-800 dark:from-rose-950 dark:via-red-950 dark:to-slate-950',
  violet:
    'border-violet-200 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-100 shadow-violet-950/5 dark:border-violet-800 dark:from-violet-950 dark:via-fuchsia-950 dark:to-slate-950',
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
