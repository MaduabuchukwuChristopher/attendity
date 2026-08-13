import {
  Badge,
  Card,
  CardHeader,
  ComparisonBarChart,
  DataTable,
  DonutChart,
  EmptyState,
  ErrorState,
  IdentifierBadge,
  MetricCard,
  ProgressMeter,
  Skeleton,
  TrendChart,
} from '@qr/ui';
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  ChartPie,
  Radio,
  ShieldAlert,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AcademicPeriodPreset } from '@qr/types';
import { useState } from 'react';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { RiskBadge } from './risk-badge.js';
import { useAnalyticsOverview } from './use-analytics.js';
import { AnalyticsPeriodControl } from './analytics-period-control.js';

export default function AnalyticsDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState<AcademicPeriodPreset>('monthly');
  const analytics = useAnalyticsOverview(period, Boolean(user && user.role !== 'student'));
  if (!user)
    return (
      <DashboardLayout>
        <ErrorState title="Your session has ended" description="Sign in to view analytics." />
      </DashboardLayout>
    );
  if (user.role === 'student' || user.role === 'examiner')
    return (
      <DashboardLayout>
        <ErrorState
          title="Access restricted"
          description="Institution analytics are not assigned to this role."
        />
      </DashboardLayout>
    );
  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Live intelligence</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Attendance analytics</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Evidence-backed trends, risk predictions, and operational attendance insight.
          </p>
        </div>
        <AnalyticsPeriodControl onChange={setPeriod} value={period} />
      </div>

      {analytics.isLoading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton className="h-28" key={index} />
          ))}
        </div>
      ) : analytics.isError || !analytics.data ? (
        <div className="mt-8">
          <ErrorState
            title="Unable to load analytics"
            description="The live attendance dataset could not be analysed."
            retry={() => void analytics.refetch()}
          />
        </div>
      ) : (
        <>
          <Card className="mt-8 flex flex-wrap items-center justify-between gap-3 border-primary/20 bg-primary/5 p-4">
            <div>
              <p className="text-sm font-semibold text-primary">
                {analytics.data.period.preset[0]!.toUpperCase() +
                  analytics.data.period.preset.slice(1)}{' '}
                view
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {new Date(analytics.data.period.from).toLocaleDateString()} –{' '}
                {new Date(analytics.data.period.to).toLocaleDateString()} · institution-local
                reporting
              </p>
            </div>
            <Badge tone="success">Live verified data</Badge>
          </Card>
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {(
              [
                [
                  'Sessions',
                  analytics.data.kpis.totalSessions,
                  BookOpenCheck,
                  'navy',
                  'Completed and live attendance sessions',
                ],
                [
                  'Verified check-ins',
                  analytics.data.kpis.totalCheckIns,
                  Activity,
                  'blue',
                  'Trusted attendance evidence recorded',
                ],
                [
                  'Average attendance',
                  `${analytics.data.kpis.averageAttendance}%`,
                  UsersRound,
                  analytics.data.kpis.averageAttendance >= 75
                    ? 'green'
                    : analytics.data.kpis.averageAttendance >= 60
                      ? 'gold'
                      : 'rose',
                  'Across the selected reporting period',
                ],
                [
                  'Live sessions',
                  analytics.data.kpis.activeSessions,
                  Radio,
                  'violet',
                  'Open for student attendance now',
                ],
                [
                  'At-risk registrations',
                  analytics.data.risks.filter(
                    (risk) => risk.level === 'high' || risk.level === 'critical',
                  ).length,
                  ShieldAlert,
                  analytics.data.risks.some(
                    (risk) => risk.level === 'high' || risk.level === 'critical',
                  )
                    ? 'rose'
                    : 'green',
                  'High or critical projected attendance risk',
                ],
              ] satisfies readonly [
                string,
                string | number,
                LucideIcon,
                'navy' | 'blue' | 'green' | 'gold' | 'violet' | 'rose',
                string,
              ][]
            ).map(([label, value, Icon, tone, supportingText]) => (
              <MetricCard
                icon={<Icon aria-hidden="true" size={18} />}
                key={label}
                label={label}
                supportingText={supportingText}
                tone={tone}
                value={value}
              />
            ))}
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card className="p-5" tone="blue">
              <CardHeader
                description="Daily verified attendance rate."
                icon={<TrendingUp size={20} />}
                title="Attendance trend"
                tone="blue"
              />
              <div className="mt-4">
                <TrendChart
                  data={analytics.data.trend.slice(-31).map((point) => ({
                    label: point.date.slice(5),
                    value: point.attendanceRate,
                  }))}
                  label="Daily attendance trend"
                  valueLabel="Attendance rate"
                />
              </div>
            </Card>
            <Card className="p-5" tone="rose">
              <CardHeader
                description="Current registration risk levels."
                icon={<ChartPie size={20} />}
                title="Risk distribution"
                tone="rose"
              />
              <DonutChart
                data={(['low', 'medium', 'high', 'critical'] as const).map((level) => ({
                  color: {
                    low: '#0B6B4F',
                    medium: '#C58B24',
                    high: '#C45568',
                    critical: '#991B1B',
                  }[level],
                  label: level[0]!.toUpperCase() + level.slice(1),
                  value: analytics.data.risks.filter((risk) => risk.level === level).length,
                }))}
                label="Attendance risk distribution"
              />
            </Card>
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_1fr]">
            <Card className="p-5" tone="violet">
              <CardHeader
                description="Top measured attendance rates."
                icon={<BarChart3 size={20} />}
                title="Course comparison"
                tone="violet"
              />
              <ComparisonBarChart
                data={analytics.data.courses.slice(0, 8).map((course) => ({
                  label: course.code,
                  value: course.attendanceRate,
                }))}
                label="Course attendance comparison"
              />
            </Card>
            <div className="grid gap-4">
              {analytics.data.insights.map((insight) => (
                <Card
                  className={`border-l-4 p-5 ${insight.tone === 'positive' ? 'border-l-emerald-600 bg-emerald-50 dark:bg-emerald-950' : insight.tone === 'warning' ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-950' : 'border-l-blue-600 bg-blue-50 dark:bg-blue-950'}`}
                  key={insight.id}
                >
                  <Badge
                    tone={
                      insight.tone === 'positive'
                        ? 'success'
                        : insight.tone === 'warning'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {insight.evidence}
                  </Badge>
                  <h2 className="mt-3 font-semibold">{insight.title}</h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {insight.description}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-2">
            <div>
              <h2 className="mb-4 text-xl font-semibold">Student leaderboard</h2>
              {analytics.data.leaderboard.length ? (
                <DataTable
                  caption="Highest student attendance rates"
                  columns={[
                    {
                      id: 'student',
                      header: 'Student',
                      cell: (row) => row.label,
                      tone: 'navy',
                    },
                    {
                      id: 'number',
                      header: 'Matric/registration no.',
                      cell: (row) => (
                        <IdentifierBadge tone="violet">{row.supportingLabel}</IdentifierBadge>
                      ),
                    },
                    {
                      id: 'attendance',
                      header: 'Attendance',
                      cell: (row) => (
                        <ProgressMeter
                          label={`${row.label} attendance`}
                          value={row.attendanceRate}
                        />
                      ),
                    },
                  ]}
                  rows={analytics.data.leaderboard}
                  rowTone={(row) =>
                    row.attendanceRate >= 75 ? 'green' : row.attendanceRate >= 60 ? 'gold' : 'rose'
                  }
                />
              ) : (
                <EmptyState
                  title="No leaderboard yet"
                  description="Closed sessions will establish ranked attendance."
                />
              )}
            </div>
            <div>
              <h2 className="mb-4 text-xl font-semibold">Live attendance feed</h2>
              {analytics.data.liveFeed.length ? (
                <DataTable
                  caption="Newest verified attendance check-ins"
                  columns={[
                    {
                      id: 'student',
                      header: 'Student',
                      cell: (row) => row.studentName,
                      tone: 'navy',
                    },
                    {
                      id: 'course',
                      header: 'Course',
                      cell: (row) => (
                        <IdentifierBadge tone="blue">{row.courseCode}</IdentifierBadge>
                      ),
                    },
                    {
                      id: 'time',
                      header: 'Time',
                      cell: (row) => new Date(row.checkedInAt).toLocaleString(),
                      tone: 'teal',
                    },
                    {
                      id: 'verification',
                      header: 'Verified',
                      cell: (row) => (
                        <Badge tone={row.gpsVerified || row.faceVerified ? 'success' : 'info'}>
                          {[row.gpsVerified ? 'GPS' : null, row.faceVerified ? 'Face' : null]
                            .filter(Boolean)
                            .join(' + ') || 'QR'}
                        </Badge>
                      ),
                    },
                  ]}
                  rows={analytics.data.liveFeed}
                  rowTone={() => 'green'}
                />
              ) : (
                <EmptyState
                  title="No live activity"
                  description="Verified check-ins appear here automatically."
                />
              )}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Attendance risk analysis</h2>
            {analytics.data.risks.length ? (
              <DataTable
                caption="Explainable attendance risk predictions"
                columns={[
                  {
                    id: 'student',
                    header: 'Student',
                    cell: (row) => `${row.studentName} — ${row.registrationNumber}`,
                    tone: 'navy',
                  },
                  {
                    id: 'course',
                    header: 'Course',
                    cell: (row) => <IdentifierBadge tone="blue">{row.courseCode}</IdentifierBadge>,
                  },
                  {
                    id: 'current',
                    header: 'Current',
                    cell: (row) => (
                      <ProgressMeter
                        label={`${row.courseCode} current attendance`}
                        value={row.currentAttendance}
                      />
                    ),
                  },
                  {
                    id: 'projected',
                    header: 'Projected',
                    cell: (row) => (
                      <ProgressMeter
                        label={`${row.courseCode} projected attendance`}
                        value={row.projectedAttendance}
                      />
                    ),
                  },
                  {
                    id: 'required',
                    header: 'Required',
                    cell: (row) => <Badge tone="warning">{row.requiredAttendance}%</Badge>,
                  },
                  { id: 'risk', header: 'Risk', cell: (row) => <RiskBadge level={row.level} /> },
                  {
                    id: 'recommendation',
                    header: 'Recommendation',
                    cell: (row) => row.recommendation,
                    tone: 'violet',
                  },
                ]}
                rows={analytics.data.risks.slice(0, 25)}
                rowTone={(row) =>
                  row.level === 'critical' || row.level === 'high'
                    ? 'rose'
                    : row.level === 'medium'
                      ? 'gold'
                      : 'green'
                }
              />
            ) : (
              <EmptyState
                title="No risk records"
                description="Approved registrations and closed sessions are required for risk analysis."
              />
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
