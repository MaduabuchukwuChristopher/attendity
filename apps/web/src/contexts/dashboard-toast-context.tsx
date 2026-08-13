import { AlertTriangle, BadgeCheck, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export interface DashboardToastInput {
  readonly tone: 'success' | 'error';
  readonly title: string;
  readonly message: string;
  readonly durationMs?: number;
}

interface DashboardToast extends DashboardToastInput {
  readonly id: string;
}

interface DashboardToastContextValue {
  notify: (input: DashboardToastInput) => string;
  dismiss: (id: string) => void;
}

let sequence = 0;
const standaloneValue: DashboardToastContextValue = {
  notify: () => `dashboard-toast-unmounted-${++sequence}`,
  dismiss: () => undefined,
};
const DashboardToastContext = createContext<DashboardToastContextValue>(standaloneValue);

function ToastItem({
  toast,
  dismiss,
}: {
  readonly toast: DashboardToast;
  readonly dismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.durationMs ?? 5_000);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.durationMs, toast.id]);

  const success = toast.tone === 'success';
  const Icon = success ? BadgeCheck : AlertTriangle;
  return (
    <div
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border p-4 shadow-2xl motion-safe:animate-[fade-in_180ms_ease-out] ${
        success
          ? 'border-emerald-400/60 bg-emerald-950 text-emerald-50'
          : 'border-rose-400/60 bg-rose-950 text-rose-50'
      }`}
      role={success ? 'status' : 'alert'}
    >
      <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={21} />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{toast.title}</p>
        <p className="mt-1 text-sm leading-5 opacity-90">{toast.message}</p>
      </div>
      <button
        aria-label={`Dismiss ${toast.title} notification`}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-current hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={() => dismiss(toast.id)}
        type="button"
      >
        <X aria-hidden="true" size={17} />
      </button>
    </div>
  );
}

export function DashboardToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<readonly DashboardToast[]>([]);
  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const notify = useCallback((input: DashboardToastInput) => {
    const id = `dashboard-toast-${++sequence}`;
    setToasts((current) => [...current, { ...input, id }].slice(-3));
    return id;
  }, []);
  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify]);

  return (
    <DashboardToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Dashboard notifications"
        className="pointer-events-none fixed right-4 top-20 z-[80] grid w-[min(24rem,calc(100vw-2rem))] gap-3"
      >
        {toasts.map((toast) => (
          <ToastItem dismiss={dismiss} key={toast.id} toast={toast} />
        ))}
      </div>
    </DashboardToastContext.Provider>
  );
}

export function useDashboardToast(): DashboardToastContextValue {
  return useContext(DashboardToastContext);
}
