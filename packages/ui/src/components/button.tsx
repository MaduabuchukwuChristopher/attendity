import clsx from 'clsx';
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export interface ButtonProps extends PropsWithChildren<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>
> {
  readonly className?: string;
  readonly variant?:
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'danger'
    | 'glass'
    | 'gradient'
    | 'outline'
    | 'download'
    | 'print'
    | 'excel'
    | 'csv'
    | 'share'
    | 'image';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-700 focus-visible:ring-primary/35 dark:text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25',
  secondary:
    'border border-border bg-surface text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100 dark:hover:bg-slate-800 shadow-sm hover:shadow-md',
  ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  danger: 'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger/35',
  glass:
    'border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 focus-visible:ring-white/40 shadow-lg shadow-black/5',
  gradient:
    'border border-primary bg-primary text-white hover:border-primary-700 hover:bg-primary-700 focus-visible:ring-primary/35 shadow-lg shadow-primary/25 hover:shadow-xl',
  outline:
    'border-2 border-primary text-primary hover:bg-primary hover:text-white focus-visible:ring-primary/35 dark:border-emerald-400 dark:text-emerald-300 dark:hover:border-primary dark:hover:text-white transition-all duration-200',
  download:
    'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500/40 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30',
  print:
    'bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 dark:bg-violet-500 dark:text-white dark:hover:bg-violet-400 shadow-lg shadow-violet-900/20 hover:shadow-violet-900/30',
  excel:
    'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/40 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400 shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/30',
  csv: 'bg-amber-400 text-amber-950 hover:bg-amber-500 focus-visible:ring-amber-500/40 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300 shadow-lg shadow-amber-900/20 hover:shadow-amber-900/30',
  share:
    'bg-cyan-400 text-cyan-950 hover:bg-cyan-500 focus-visible:ring-cyan-500/40 dark:bg-cyan-400 dark:text-cyan-950 dark:hover:bg-cyan-300 shadow-lg shadow-cyan-900/20 hover:shadow-cyan-900/30',
  image:
    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400 shadow-lg shadow-rose-900/20 hover:shadow-rose-900/30',
};

export function buttonClassName(
  variant: NonNullable<ButtonProps['variant']> = 'primary',
  className?: string,
): string {
  return clsx(
    'inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98]',
    variantClasses[variant],
    className,
  );
}

export function Button({
  children,
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName(
        variant,
        clsx('disabled:pointer-events-none disabled:opacity-50', className),
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
