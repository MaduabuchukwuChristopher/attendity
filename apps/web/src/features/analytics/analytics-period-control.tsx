import type { AcademicPeriodPreset } from '@qr/types';

const presets: readonly { value: Exclude<AcademicPeriodPreset, 'custom'>; label: string }[] = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'semester', label: 'Semester' },
];

export function AnalyticsPeriodControl({
  value,
  onChange,
}: {
  readonly value: AcademicPeriodPreset;
  readonly onChange: (value: AcademicPeriodPreset) => void;
}) {
  return (
    <div
      aria-label="Analytics period"
      className="flex flex-wrap gap-1 rounded-2xl border border-border bg-surface p-1 shadow-sm dark:border-slate-700 dark:bg-dark-surface"
      role="group"
    >
      {presets.map((preset) => (
        <button
          aria-pressed={value === preset.value}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${value === preset.value ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-primary/10 hover:text-primary dark:text-slate-200'}`}
          key={preset.value}
          onClick={() => onChange(preset.value)}
          type="button"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
