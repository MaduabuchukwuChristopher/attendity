import clsx from 'clsx';
import type { ReactNode } from 'react';

export type MetricCardTone = 'green' | 'teal' | 'navy' | 'blue' | 'gold' | 'rose' | 'violet';

const toneClasses: Record<
  MetricCardTone,
  { card: string; icon: string; label: string; supporting: string; value: string }
> = {
  green: {
    card: 'border-emerald-200 bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-100 shadow-emerald-950/10 dark:border-emerald-800 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-950',
    icon: 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-emerald-950',
    label: 'text-emerald-800 dark:text-emerald-200',
    supporting: 'text-emerald-800/80 dark:text-emerald-200/80',
    value: 'text-emerald-800 dark:text-emerald-200',
  },
  teal: {
    card: 'border-teal-200 bg-gradient-to-br from-teal-100 via-cyan-50 to-blue-100 shadow-teal-950/10 dark:border-teal-800 dark:from-teal-950 dark:via-cyan-950 dark:to-slate-950',
    icon: 'bg-teal-700 text-white dark:bg-teal-400 dark:text-teal-950',
    label: 'text-teal-800 dark:text-teal-200',
    supporting: 'text-teal-800/80 dark:text-teal-200/80',
    value: 'text-teal-800 dark:text-teal-200',
  },
  navy: {
    card: 'border-blue-300 bg-gradient-to-br from-blue-100 via-indigo-100 to-slate-200 shadow-blue-950/10 dark:border-blue-800 dark:from-blue-950 dark:via-indigo-950 dark:to-slate-950',
    icon: 'bg-university-navy text-white dark:bg-slate-700',
    label: 'text-university-navy dark:text-slate-200',
    supporting: 'text-blue-900/75 dark:text-blue-200/80',
    value: 'text-university-navy dark:text-slate-100',
  },
  blue: {
    card: 'border-blue-200 bg-gradient-to-br from-blue-100 via-cyan-50 to-sky-100 shadow-blue-950/10 dark:border-blue-800 dark:from-blue-950 dark:via-cyan-950 dark:to-slate-950',
    icon: 'bg-blue-700 text-white dark:bg-blue-500 dark:text-blue-950',
    label: 'text-blue-800 dark:text-blue-200',
    supporting: 'text-blue-800/80 dark:text-blue-200/80',
    value: 'text-blue-800 dark:text-blue-200',
  },
  gold: {
    card: 'border-amber-200 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 shadow-amber-950/10 dark:border-amber-800 dark:from-amber-950 dark:via-orange-950 dark:to-slate-950',
    icon: 'bg-amber-600 text-white dark:bg-amber-400 dark:text-amber-950',
    label: 'text-amber-800 dark:text-amber-200',
    supporting: 'text-amber-800/80 dark:text-amber-200/80',
    value: 'text-amber-800 dark:text-amber-200',
  },
  rose: {
    card: 'border-rose-200 bg-gradient-to-br from-rose-100 via-red-50 to-orange-100 shadow-rose-950/10 dark:border-rose-800 dark:from-rose-950 dark:via-red-950 dark:to-slate-950',
    icon: 'bg-rose-700 text-white dark:bg-rose-500 dark:text-rose-950',
    label: 'text-rose-800 dark:text-rose-200',
    supporting: 'text-rose-800/80 dark:text-rose-200/80',
    value: 'text-rose-800 dark:text-rose-200',
  },
  violet: {
    card: 'border-violet-200 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-100 shadow-violet-950/10 dark:border-violet-800 dark:from-violet-950 dark:via-fuchsia-950 dark:to-slate-950',
    icon: 'bg-violet-700 text-white dark:bg-violet-500 dark:text-violet-950',
    label: 'text-violet-800 dark:text-violet-200',
    supporting: 'text-violet-800/80 dark:text-violet-200/80',
    value: 'text-violet-800 dark:text-violet-200',
  },
};

export interface MetricCardProps {
  readonly className?: string;
  readonly icon?: ReactNode;
  readonly label: string;
  readonly supportingText?: string;
  readonly tone?: MetricCardTone;
  readonly value: string | number;
}

export function MetricCard({
  className,
  icon,
  label,
  supportingText,
  tone = 'green',
  value,
}: MetricCardProps) {
  const treatment = toneClasses[tone];

  return (
    <section
      aria-label={`${label}: ${String(value)}`}
      className={clsx(
        'rounded-2xl border p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5',
        treatment.card,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={clsx('text-sm font-semibold', treatment.label)}>{label}</p>
          <p className={clsx('mt-2 text-3xl font-bold tracking-tight', treatment.value)}>{value}</p>
        </div>
        {icon ? (
          <span
            className={clsx('grid size-10 shrink-0 place-items-center rounded-xl', treatment.icon)}
          >
            {icon}
          </span>
        ) : null}
      </div>
      {supportingText ? (
        <p className={clsx('mt-3 text-xs font-medium leading-5', treatment.supporting)}>
          {supportingText}
        </p>
      ) : null}
    </section>
  );
}
