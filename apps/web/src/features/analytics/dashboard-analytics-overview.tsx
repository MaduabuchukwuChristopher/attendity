import {
  Activity,
  BarChart3,
  BookOpenCheck,
  ChartPie,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  ComparisonBarChart,
  DonutChart,
  ErrorState,
  MetricCard,
  Skeleton,
  TrendChart,
} from '@qr/ui';
import type { AcademicPeriodPreset, AnalyticsOverview } from '@qr/types';
import { useState } from 'react';
import { AnalyticsPeriodControl } from './analytics-period-control.js';
import { useAnalyticsOverview } from './use-analytics.js';

const riskColours = {
  low: '#0B6B4F',
  medium: '#C58B24',
  high: '#C45568',
  critical: '#991B1B',
} as const;

export function DashboardAnalyticsContent({
  analytics,
  heading,
  scopeName = 'Institution',
}: {
  readonly analytics: AnalyticsOverview;
  readonly heading: string;
  readonly scopeName?: string;
}) {
  const atRisk = analytics.risks.filter(
    (risk) => risk.level === 'high' || risk.level === 'critical',
  ).length;

  return (
    <div className="mt-5">
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label={`${heading} metrics`}
      >
        <MetricCard
          icon={<BookOpenCheck aria-hidden="true" size={19} />}
          label="Sessions"
          supportingText="Completed and live attendance sessions"
          tone="navy"
          value={analytics.kpis.totalSessions}
        />
        <MetricCard
          icon={<Activity aria-hidden="true" size={19} />}
          label="Verified check-ins"
          supportingText="Recorded from trusted attendance evidence"
          tone="blue"
          value={analytics.kpis.totalCheckIns}
        />
        <MetricCard
          icon={<TrendingUp aria-hidden="true" size={19} />}
          label="Average attendance"
          supportingText="Across the selected academic period"
          tone={
            analytics.kpis.averageAttendance >= 75
              ? 'green'
              : analytics.kpis.averageAttendance >= 60
                ? 'gold'
                : 'rose'
          }
          value={`${analytics.kpis.averageAttendance}%`}
        />
        <MetricCard
          icon={<ShieldAlert aria-hidden="true" size={19} />}
          label="At-risk registrations"
          supportingText="High or critical attendance risk"
          tone={atRisk ? 'rose' : 'green'}
          value={atRisk}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3" aria-label={`${heading} charts`}>
        <Card className="p-5 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardHeader
              description="Attendance movement"
              icon={<TrendingUp size={19} />}
              title="Daily attendance trend"
              tone="blue"
            />
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {analytics.period.days} day view
            </span>
          </div>
          <div className="mt-2">
            <TrendChart
              data={analytics.trend.map((point) => ({
                label: point.date.slice(5),
                value: point.attendanceRate,
              }))}
              label={`${scopeName} attendance trend`}
              valueLabel="Attendance rate"
            />
          </div>
        </Card>

        <Card className="p-5">
          <CardHeader
            description="Student standing"
            icon={<ChartPie size={19} />}
            title="Risk distribution"
            tone="rose"
          />
          <DonutChart
            data={(['low', 'medium', 'high', 'critical'] as const).map((level) => ({
              color: riskColours[level],
              label: level[0]!.toUpperCase() + level.slice(1),
              value: analytics.risks.filter((risk) => risk.level === level).length,
            }))}
            label={`${scopeName} risk distribution`}
          />
        </Card>

        <Card className="p-5 xl:col-span-3">
          <CardHeader
            description="Course performance"
            icon={<BarChart3 size={19} />}
            title="Attendance by course"
            tone="violet"
          />
          <ComparisonBarChart
            data={analytics.courses.slice(0, 8).map((course) => ({
              label: course.code,
              value: course.attendanceRate,
            }))}
            label={`${scopeName} course comparison`}
          />
        </Card>
      </section>
    </div>
  );
}

export function DashboardAnalyticsOverview({
  heading,
  description,
  scopeName,
}: {
  readonly description: string;
  readonly heading: string;
  readonly scopeName?: string;
}) {
  const [period, setPeriod] = useState<AcademicPeriodPreset>('monthly');
  const analytics = useAnalyticsOverview(period);

  return (
    <section className="mt-9" aria-labelledby="dashboard-analytics-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Live academic intelligence</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight" id="dashboard-analytics-title">
            {heading}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <AnalyticsPeriodControl onChange={setPeriod} value={period} />
      </div>

      {analytics.isLoading ? (
        <div
          className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Loading dashboard analytics"
          role="status"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="h-32" key={index} />
          ))}
        </div>
      ) : analytics.isError || !analytics.data ? (
        <div className="mt-5">
          <ErrorState
            description="Attendance operations remain available while this live insight is retried."
            retry={() => void analytics.refetch()}
            title="Dashboard analytics are temporarily unavailable"
          />
        </div>
      ) : (
        <DashboardAnalyticsContent
          analytics={analytics.data}
          heading={heading}
          {...(scopeName ? { scopeName } : {})}
        />
      )}
    </section>
  );
}
