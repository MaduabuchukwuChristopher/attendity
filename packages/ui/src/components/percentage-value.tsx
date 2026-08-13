import clsx from 'clsx';

function percentageClass(value: number): string {
  if (value >= 75) return 'text-emerald-700 dark:text-emerald-300';
  if (value >= 60) return 'text-amber-700 dark:text-amber-300';
  return 'text-rose-700 dark:text-rose-300';
}

export function PercentageValue({
  className,
  value,
}: {
  readonly className?: string;
  readonly value: number;
}) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <span className={clsx('font-bold tabular-nums', percentageClass(safeValue), className)}>
      {safeValue}%
    </span>
  );
}
