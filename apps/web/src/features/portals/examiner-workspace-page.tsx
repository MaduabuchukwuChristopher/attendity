import { useMutation } from '@tanstack/react-query';
import type { ClearanceVerification } from '@qr/types';
import { Badge, Button, Card, EmptyState, ErrorState, PercentageValue } from '@qr/ui';
import { CircleAlert, Search, ShieldCheck, ShieldX, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { apiClient } from '../../api/client.js';
import { dashboardFormControlClassName } from '../../components/dashboard-form-control.js';
import { QrScanner } from '../attendance/qr-scanner.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { ExaminerVerificationOverview } from '../analytics/examiner-verification-overview.js';
import { apiErrorMessage } from '../auth/auth-utils.js';

interface Envelope<T> {
  readonly data: T;
}

interface VerificationNotification {
  readonly tone: 'success' | 'error';
  readonly title: string;
  readonly message: string;
}

function referenceFromScan(value: string): string {
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? value);
  } catch {
    return value.trim();
  }
}

export default function ExaminerWorkspacePage() {
  const user = useAuthStore((state) => state.user);
  const [history, setHistory] = useState<readonly ClearanceVerification[]>([]);
  const [scannerCloseSignal, setScannerCloseSignal] = useState(0);
  const [notification, setNotification] = useState<VerificationNotification>();
  const verification = useMutation({
    mutationFn: async (reference: string) =>
      (
        await apiClient.get<Envelope<readonly ClearanceVerification[]>>(
          '/clearance/examiner/search',
          { params: { reference } },
        )
      ).data.data,
    onMutate: () => setNotification(undefined),
    onSuccess: (results) => {
      setHistory((current) => [...results, ...current].slice(0, 20));
      const result = results[0];
      if (!result) return;
      setNotification(
        result.verified
          ? {
              tone: 'success',
              title: 'Clearance verified',
              message: result.reportId
                ? `Report ${result.reportId} is valid for examination admission.`
                : 'This clearance is valid for examination admission.',
            }
          : {
              tone: 'error',
              title: 'Clearance rejected',
              message: result.warning ?? `The report status is ${result.status}.`,
            },
      );
    },
    onError: (error) =>
      setNotification({
        tone: 'error',
        title: 'Verification failed',
        message: apiErrorMessage(
          error,
          'The verification service could not complete this check. Please retry.',
        ),
      }),
    onSettled: () => setScannerCloseSignal((value) => value + 1),
  });
  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(undefined), 5_000);
    return () => window.clearTimeout(timer);
  }, [notification]);
  if (!user)
    return (
      <DashboardLayout>
        <ErrorState title="Your session has ended" description="Sign in to verify clearance." />
      </DashboardLayout>
    );
  if (user.role !== 'examiner')
    return (
      <DashboardLayout>
        <ErrorState
          title="Access restricted"
          description="This workspace is assigned to examination officers."
        />
      </DashboardLayout>
    );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('reference');
    if (typeof value === 'string' && value.trim()) verification.mutate(value.trim());
  };
  const latest = verification.data;
  const latestResult = latest?.[0];
  const scannerFeedback = verification.isPending ? (
    <p
      className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
      role="status"
    >
      QR detected. Checking the live report…
    </p>
  ) : verification.isError ? (
    <p
      className="mt-4 rounded-xl border border-rose-300 bg-rose-100 px-4 py-3 text-sm font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
      role="alert"
    >
      {apiErrorMessage(
        verification.error,
        'The verification service could not complete this check. Please retry.',
      )}
    </p>
  ) : latestResult ? (
    <p
      className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
        latestResult.verified
          ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
          : 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200'
      }`}
      role={latestResult.verified ? 'status' : 'alert'}
    >
      {latestResult.verified
        ? `Clearance verified${latestResult.reportId ? ` — ${latestResult.reportId}` : ''}`
        : `Clearance rejected — ${latestResult.warning ?? latestResult.status}`}
    </p>
  ) : null;
  return (
    <DashboardLayout>
      <p className="text-sm font-semibold text-primary">Examination admission control</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Clearance verification</h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
        Scan continuously or search by report ID, verification reference, or matric number. Every
        result is checked against the live server record.
      </p>

      <div className="mt-8 grid items-start gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <QrScanner
          closeSignal={scannerCloseSignal}
          continuous
          description="Keep the camera open for rapid admission checks. Each distinct QR is verified by the server."
          feedback={scannerFeedback}
          onScan={(value) => verification.mutate(referenceFromScan(value))}
          title="Continuous clearance scanner"
        />
        <Card
          aria-label="Search the archive card"
          className="self-start border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950"
          role="region"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-sm dark:bg-violet-500 dark:text-slate-950">
              <Search aria-hidden="true" size={21} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">Search the archive</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Report ID, QR reference, or matric number
              </p>
            </div>
          </div>
          <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
            <label className="sr-only" htmlFor="clearance-reference">
              Clearance reference
            </label>
            <input
              autoComplete="off"
              className={`${dashboardFormControlClassName} flex-1`}
              id="clearance-reference"
              maxLength={120}
              minLength={2}
              name="reference"
              placeholder="ACL-... or matric number"
              required
            />
            <Button className="gap-2" disabled={verification.isPending} type="submit">
              <Search size={17} /> Verify
            </Button>
          </form>
          <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            Printed attendance values are not proof. Admit a student only when this screen returns a
            current green verified result.
          </div>
        </Card>
      </div>

      <ExaminerVerificationOverview history={history} />

      {verification.isPending ? (
        <p className="mt-6 text-sm text-slate-500" role="status">
          Checking the live report archive…
        </p>
      ) : null}
      {verification.isError ? (
        <div className="mt-6">
          <ErrorState
            title="Verification failed"
            description="No generated clearance matched that reference, or the server could not complete the check."
          />
        </div>
      ) : null}
      {latest ? (
        <section className="mt-8" aria-labelledby="latest-verification-heading">
          <h2 className="mb-4 text-xl font-semibold" id="latest-verification-heading">
            Latest result
          </h2>
          <div className="grid gap-4">
            {latest.map((result) => (
              <Card
                className={`border-l-4 p-5 ${result.verified ? 'border-l-primary' : 'border-l-danger'}`}
                key={`${result.reportId}-${result.verificationTime}`}
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                  <div className="flex gap-4">
                    {result.student?.photoUrl ? (
                      <img
                        alt={`${result.student.name} student profile`}
                        className="size-12 shrink-0 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                        src={result.student.photoUrl}
                      />
                    ) : (
                      <span
                        className={`grid size-12 shrink-0 place-items-center rounded-xl ${result.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}
                      >
                        {result.verified ? <ShieldCheck size={24} /> : <ShieldX size={24} />}
                      </span>
                    )}
                    <div>
                      <Badge tone={result.verified ? 'success' : 'danger'}>
                        {result.verified ? 'Verified' : result.status}
                      </Badge>
                      <h3 className="mt-2 text-lg font-bold">
                        {result.student?.name ?? 'Unknown report'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {result.student?.matricNumber} ·{' '}
                        {result.course
                          ? `${result.course.code} - ${result.course.title}`
                          : result.reportId}
                      </p>
                    </div>
                  </div>
                  <div className="md:text-right">
                    <PercentageValue
                      className="text-2xl"
                      value={result.attendancePercentage ?? 0}
                    />
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Requirement{' '}
                      <PercentageValue
                        className="inline text-sm"
                        value={result.requiredPercentage ?? 0}
                      />
                    </p>
                  </div>
                </div>
                {result.warning ? (
                  <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <CircleAlert className="shrink-0" size={18} />
                    {result.warning}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Ready for admission checks"
            description="Scan a report QR or enter a reference to begin."
          />
        </div>
      )}

      {history.length ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Recent checks</h2>
          <Card className="divide-y divide-border overflow-hidden p-0">
            {history.map((result, index) => (
              <div
                className={`flex items-center justify-between gap-4 border-l-4 p-4 transition-colors ${result.verified ? 'border-l-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900' : 'border-l-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900'}`}
                key={`${result.reportId}-${result.verificationTime}-${index}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {result.student?.name ?? result.reportId ?? 'Unknown report'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {result.course?.code ?? result.status} ·{' '}
                    {new Date(result.verificationTime).toLocaleTimeString()}
                  </p>
                </div>
                <Badge tone={result.verified ? 'success' : 'danger'}>
                  {result.verified ? 'Verified' : 'Rejected'}
                </Badge>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {notification ? (
        <div
          aria-label={notification.title}
          className={`fixed inset-x-4 bottom-4 z-50 flex items-start gap-3 rounded-2xl border px-4 py-4 text-white shadow-2xl sm:left-auto sm:right-6 sm:max-w-sm ${
            notification.tone === 'success'
              ? 'border-emerald-300 bg-emerald-950 shadow-emerald-950/30 dark:border-emerald-600 dark:bg-emerald-900'
              : 'border-rose-300 bg-rose-950 shadow-rose-950/30 dark:border-rose-600 dark:bg-rose-900'
          }`}
          role={notification.tone === 'success' ? 'status' : 'alert'}
        >
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${
              notification.tone === 'success'
                ? 'bg-emerald-400 text-emerald-950'
                : 'bg-rose-300 text-rose-950'
            }`}
          >
            {notification.tone === 'success' ? (
              <ShieldCheck aria-hidden="true" size={23} />
            ) : (
              <ShieldX aria-hidden="true" size={23} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{notification.title}</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                notification.tone === 'success' ? 'text-emerald-100' : 'text-rose-100'
              }`}
            >
              {notification.message}
            </p>
          </div>
          <button
            aria-label="Dismiss verification notification"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            onClick={() => setNotification(undefined)}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
