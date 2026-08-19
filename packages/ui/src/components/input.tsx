import clsx from 'clsx';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  readonly className?: string;
  readonly error?: string;
  readonly label: string;
}
export function Input({ className, error, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label
      className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"
      htmlFor={inputId}
    >
      <span>{label}</span>
      <input
        className={clsx(
          'h-11 min-w-0 w-full max-w-full rounded-xl border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:bg-dark-surface',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <span className="text-xs text-danger" id={`${inputId}-error`}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
