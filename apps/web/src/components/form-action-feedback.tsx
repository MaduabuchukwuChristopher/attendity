import { AlertTriangle, BadgeCheck } from 'lucide-react';

interface FormActionFeedbackProps {
  readonly status: 'idle' | 'success' | 'error';
  readonly message?: string | undefined;
}

export function FormActionFeedback({ status, message }: FormActionFeedbackProps) {
  if (status === 'idle' || !message) return null;
  const success = status === 'success';
  const Icon = success ? BadgeCheck : AlertTriangle;
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold ${
        success
          ? 'border-emerald-300 bg-emerald-100/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200'
          : 'border-rose-300 bg-rose-100/80 text-rose-900 dark:border-rose-700 dark:bg-rose-950/70 dark:text-rose-200'
      }`}
      role={success ? 'status' : 'alert'}
    >
      <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
      <span>{message}</span>
    </div>
  );
}
