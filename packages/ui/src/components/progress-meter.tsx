import clsx from 'clsx';

export type ProgressMeterTone = 'success' | 'warning' | 'danger' | 'info';

const fillClasses: Record<ProgressMeterTone, string> = {
  success: 'bg-emerald-600 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  danger: 'bg-rose-600 dark:bg-rose-400',
  info: 'bg-blue-600 dark:bg-blue-400',
};

const valueClasses: Record<ProgressMeterTone, string> = {
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
  info: 'text-blue-700 dark:text-blue-300',
};

function inferredTone(value: number): ProgressMeterTone {
  if (value >= 75) return 'success';
  if (value >= 60) return 'warning';
  return 'danger';
}

export interface ProgressMeterProps {
  readonly label: string;
  readonly tone?: ProgressMeterTone;
  readonly value: number;
}

export function ProgressMeter({ label, tone, value }: ProgressMeterProps) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));
  const resolvedTone = tone ?? inferredTone(safeValue);

  return (
    <div className="min-w-28">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold">
        <span className="sr-only">{label}</span>
        <span aria-hidden="true" className="text-slate-500 dark:text-slate-400">
          Attendance
        </span>
        <span className={valueClasses[resolvedTone]}>{safeValue}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={safeValue}
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
      >
        <span
          className={clsx('block h-full rounded-full', fillClasses[resolvedTone])}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
