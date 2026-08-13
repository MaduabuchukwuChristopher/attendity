import clsx from 'clsx';
import type { ReactNode } from 'react';

export type SemanticTone = 'green' | 'teal' | 'navy' | 'blue' | 'gold' | 'rose' | 'violet';

export const semanticValueClasses: Record<SemanticTone, string> = {
  green: 'text-emerald-700 dark:text-emerald-300',
  teal: 'text-teal-700 dark:text-teal-300',
  navy: 'text-blue-900 dark:text-blue-200',
  blue: 'text-blue-700 dark:text-blue-300',
  gold: 'text-amber-700 dark:text-amber-300',
  rose: 'text-rose-700 dark:text-rose-300',
  violet: 'text-violet-700 dark:text-violet-300',
};

export interface SemanticValueProps {
  readonly className?: string;
  readonly suffix?: ReactNode;
  readonly tone: SemanticTone;
  readonly value: ReactNode;
}

export function SemanticValue({ className, suffix, tone, value }: SemanticValueProps) {
  return (
    <span className={clsx('font-bold tabular-nums', semanticValueClasses[tone], className)}>
      {value}
      {suffix}
    </span>
  );
}
