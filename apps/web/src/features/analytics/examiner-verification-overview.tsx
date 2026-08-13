import { ShieldCheck, ShieldQuestion, ShieldX } from 'lucide-react';
import type { ClearanceVerification } from '@qr/types';
import { Card, CardHeader, DonutChart, MetricCard } from '@qr/ui';

export function ExaminerVerificationOverview({
  history,
}: {
  readonly history: readonly ClearanceVerification[];
}) {
  const verified = history.filter((item) => item.verified).length;
  const rejected = history.length - verified;

  return (
    <section className="mt-9" aria-labelledby="examiner-analytics-title">
      <div>
        <p className="text-sm font-semibold text-primary">Admission intelligence</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight" id="examiner-analytics-title">
          Verification activity
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          A live summary of clearance decisions completed in this workspace session.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<ShieldQuestion aria-hidden="true" size={19} />}
          label="Checks completed"
          supportingText="Server-verified admission lookups"
          tone="navy"
          value={history.length}
        />
        <MetricCard
          icon={<ShieldCheck aria-hidden="true" size={19} />}
          label="Verified"
          supportingText="Current valid clearance records"
          tone="green"
          value={verified}
        />
        <MetricCard
          icon={<ShieldX aria-hidden="true" size={19} />}
          label="Rejected"
          supportingText="Invalid, missing, or ineligible records"
          tone={rejected ? 'rose' : 'green'}
          value={rejected}
        />
      </div>

      {history.length ? (
        <Card className="mt-5 p-5" tone="teal">
          <CardHeader
            description="Decision mix"
            icon={<ShieldCheck size={19} />}
            title="Verified versus rejected"
            tone="teal"
          />
          <DonutChart
            data={[
              { color: '#0B6B4F', label: 'Verified', value: verified },
              { color: '#C45568', label: 'Rejected', value: rejected },
            ]}
            label="Examiner verification distribution"
          />
        </Card>
      ) : (
        <Card className="mt-5 border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-700 text-white dark:bg-blue-400 dark:text-blue-950">
              <ShieldQuestion aria-hidden="true" size={22} />
            </span>
            <div>
              <h3 className="font-bold">Analytics begin with your first live verification.</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Scan a clearance QR or search a reference. Attendity will chart only genuine server
                decisions made during this session.
              </p>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
