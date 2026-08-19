import clsx from 'clsx';
import type { SelectHTMLAttributes } from 'react';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  readonly className?: string;
  readonly error?: string;
  readonly label: string;
}

export function Select({ children, className, error, id, label, ...props }: SelectProps) {
  const selectId = id ?? props.name;
  return (
    <label
      className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
      htmlFor={selectId}
    >
      <span>{label}</span>
      <select
        aria-describedby={error ? `${selectId}-error` : undefined}
        aria-invalid={Boolean(error)}
        className={clsx(
          'h-11 min-w-0 w-full max-w-full rounded-xl border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-dark-surface',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        id={selectId}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <span className="text-xs text-danger" id={`${selectId}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
