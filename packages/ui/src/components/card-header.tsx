import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { SemanticTone } from './semantic-value.js';

const headingToneClasses: Record<SemanticTone, { readonly icon: string; readonly title: string }> =
  {
    green: {
      icon: 'bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950',
      title: 'text-emerald-900 dark:text-emerald-100',
    },
    teal: {
      icon: 'bg-teal-700 text-white dark:bg-teal-400 dark:text-teal-950',
      title: 'text-teal-900 dark:text-teal-100',
    },
    navy: {
      icon: 'bg-university-navy text-white dark:bg-blue-400 dark:text-blue-950',
      title: 'text-university-navy dark:text-blue-100',
    },
    blue: {
      icon: 'bg-blue-700 text-white dark:bg-blue-400 dark:text-blue-950',
      title: 'text-blue-900 dark:text-blue-100',
    },
    gold: {
      icon: 'bg-amber-600 text-white dark:bg-amber-400 dark:text-amber-950',
      title: 'text-amber-900 dark:text-amber-100',
    },
    rose: {
      icon: 'bg-rose-700 text-white dark:bg-rose-400 dark:text-rose-950',
      title: 'text-rose-900 dark:text-rose-100',
    },
    violet: {
      icon: 'bg-violet-700 text-white dark:bg-violet-400 dark:text-violet-950',
      title: 'text-violet-900 dark:text-violet-100',
    },
  };

export interface CardHeaderProps {
  readonly className?: string;
  readonly description?: ReactNode;
  readonly icon: ReactNode;
  readonly level?: 2 | 3;
  readonly title: ReactNode;
  readonly tone: SemanticTone;
}

export function CardHeader({
  className,
  description,
  icon,
  level = 2,
  title,
  tone,
}: CardHeaderProps) {
  const treatment = headingToneClasses[tone];
  const heading =
    level === 3 ? (
      <h3 className={clsx('font-bold', treatment.title)}>{title}</h3>
    ) : (
      <h2 className={clsx('font-bold', treatment.title)}>{title}</h2>
    );

  return (
    <div className={clsx('flex items-start gap-3', className)} data-card-heading="true">
      <span
        aria-hidden="true"
        className={clsx(
          'grid size-11 shrink-0 place-items-center rounded-xl shadow-lg shadow-current/10',
          treatment.icon,
        )}
        data-card-icon="true"
        data-testid="card-header-icon"
      >
        {icon}
      </span>
      <div className="min-w-0">
        {heading}
        {description ? (
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
