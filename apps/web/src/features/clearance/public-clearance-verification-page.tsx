import { useQuery } from '@tanstack/react-query';
import type { ClearanceVerification } from '@qr/types';
import { Badge, Card, ErrorState, Skeleton } from '@qr/ui';
import { CircleAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../../api/client.js';

interface Envelope<T> {
  readonly data: T;
}

export default function PublicClearanceVerificationPage() {
  const { reference = '' } = useParams();
  const verification = useQuery({
    queryKey: ['public-clearance-verification', reference],
    queryFn: async () =>
      (
        await apiClient.get<Envelope<ClearanceVerification>>(
          `/clearance/verification/${encodeURIComponent(reference)}`,
          { validateStatus: (status) => status < 500 },
        )
      ).data.data,
    enabled: reference.length >= 10,
    retry: false,
  });
  const result = verification.data;
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-slate-900 dark:bg-dark-background dark:text-slate-100">
      <div className="mx-auto max-w-2xl">
        <Link className="text-lg font-bold text-primary" to="/">
          Attendity
        </Link>
        <Card className="mt-6 overflow-hidden">
          <header className="bg-emerald-950 px-6 py-8 text-white sm:px-8">
            <p className="text-sm font-semibold text-emerald-200">
              Institution server verification
            </p>
            <h1 className="mt-2 text-3xl font-bold">Attendance clearance</h1>
            <p className="mt-2 text-sm text-emerald-100">
              Verification is performed against the live report archive.
            </p>
          </header>
          <div className="p-6 sm:p-8" aria-live="polite">
            {verification.isLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="mt-5 h-52" />
              </>
            ) : verification.isError || !result ? (
              <ErrorState
                title="Verification unavailable"
                description="The verification server could not complete this request."
              />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span
                    className={`grid size-14 place-items-center rounded-2xl ${result.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}
                  >
                    {result.verified ? <ShieldCheck size={28} /> : <ShieldX size={28} />}
                  </span>
                  <div>
                    <Badge tone={result.verified ? 'success' : 'danger'}>
                      {result.verified ? 'Verified' : result.status.replace('_', ' ')}
                    </Badge>
                    <h2 className="mt-2 text-2xl font-bold">
                      {result.verified
                        ? 'Valid examination clearance'
                        : 'Do not accept this report'}
                    </h2>
                  </div>
                </div>
                {result.warning ? (
                  <div className="mt-6 flex gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <CircleAlert className="shrink-0" size={20} />
                    <p className="text-sm">{result.warning}</p>
                  </div>
                ) : null}
                {result.student && result.course ? (
                  <div className="mt-7 flex flex-col gap-6 sm:flex-row">
                    {result.student.photoUrl ? (
                      <img
                        alt={`${result.student.name} student profile`}
                        className="size-28 rounded-2xl border border-border object-cover"
                        referrerPolicy="no-referrer"
                        src={result.student.photoUrl}
                      />
                    ) : (
                      <div className="grid size-28 shrink-0 place-items-center rounded-2xl border border-border bg-slate-50 px-3 text-center text-xs text-slate-500 dark:bg-slate-800">
                        No photo on file
                      </div>
                    )}
                    <dl className="grid flex-1 gap-5 sm:grid-cols-2">
                      {[
                        ['Student', result.student.name],
                        ['Matric number', result.student.matricNumber],
                        ['Course', `${result.course.code} - ${result.course.title}`],
                        ['Attendance', `${result.attendancePercentage}%`],
                        ['Requirement', `${result.requiredPercentage}%`],
                        ['Eligibility', result.eligibility?.replace('_', ' ') ?? 'Unknown'],
                        ['Report ID', result.reportId ?? 'Unknown'],
                        [
                          'Issue date',
                          result.issueDate
                            ? new Date(result.issueDate).toLocaleString()
                            : 'Unknown',
                        ],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {label}
                          </dt>
                          <dd className="mt-1 font-medium">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
                <p className="mt-8 border-t border-border pt-5 text-xs text-slate-500">
                  Verified at {new Date(result.verificationTime).toLocaleString()}. Refresh this
                  page before every examination admission decision.
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
