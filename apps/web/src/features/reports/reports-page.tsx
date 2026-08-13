import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  IdentifierBadge,
  MetricCard,
  PercentageValue,
  Skeleton,
} from '@qr/ui';
import { format, subDays } from 'date-fns';
import {
  CalendarClock,
  FileChartColumnIncreasing,
  ListFilter,
  ShieldCheck,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import {
  dashboardDateControlClassName,
  dashboardFormControlClassName,
} from '../../components/dashboard-form-control.js';
import { useAuthStore } from '../../store/auth-store.js';
import { RiskBadge } from '../analytics/risk-badge.js';
import {
  useAnalyticsOverview,
  useAnalyticsReport,
  type ReportFilters,
} from '../analytics/use-analytics.js';
import { downloadAnalyticsReport, type AnalyticsExportFormat } from './report-export.js';

function initialFilters(student: boolean): ReportFilters {
  return {
    scope: student ? 'student' : 'university',
    from: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    page: 1,
    limit: 25,
  };
}

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.role === 'student';
  const canUseAnalytics = Boolean(user && user.role !== 'student' && user.role !== 'examiner');
  const courses = useAnalyticsOverview(365, canUseAnalytics);
  const [filters, setFilters] = useState<ReportFilters>(() => initialFilters(Boolean(isStudent)));
  const [exporting, setExporting] = useState<AnalyticsExportFormat>();
  const report = useAnalyticsReport(filters, Boolean(user && user.role !== 'examiner'));
  if (!user)
    return (
      <DashboardLayout>
        <ErrorState title="Your session has ended" description="Sign in to view reports." />
      </DashboardLayout>
    );
  if (user.role === 'examiner')
    return (
      <DashboardLayout>
        <ErrorState
          title="Access restricted"
          description="Examiners verify signed clearance records from the examiner workspace."
        />
      </DashboardLayout>
    );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const scopeValue = data.get('scope');
    const from = data.get('from');
    const to = data.get('to');
    const courseId = data.get('courseId');
    if (typeof scopeValue !== 'string' || typeof from !== 'string' || typeof to !== 'string')
      return;
    const scope = scopeValue as ReportFilters['scope'];
    setFilters({
      scope: isStudent ? 'student' : scope,
      ...(scope === 'course' && typeof courseId === 'string' && courseId ? { courseId } : {}),
      from,
      to,
      page: 1,
      limit: 25,
    });
  };
  const exportReport = async (format: AnalyticsExportFormat, reportId: string) => {
    setExporting(format);
    try {
      await downloadAnalyticsReport(format, filters, reportId);
    } finally {
      setExporting(undefined);
    }
  };
  return (
    <DashboardLayout>
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-white">
          <FileChartColumnIncreasing aria-hidden="true" size={22} />
        </span>
        <div>
          <p className="text-sm font-semibold text-primary">Live institutional data</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Attendance reports</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Generate filter-aware reports directly from verified attendance records.
          </p>
        </div>
      </div>

      <Card className="mt-8 p-5" tone="blue">
        <CardHeader
          description="Choose a scope and reporting period from verified attendance data."
          icon={<ListFilter size={20} />}
          title="Report filters"
          tone="blue"
        />
        <form
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end"
          onSubmit={submit}
        >
          <label className="grid gap-2 text-sm font-medium">
            Report type
            <select
              className={dashboardFormControlClassName}
              defaultValue={filters.scope}
              disabled={isStudent}
              name="scope"
            >
              {isStudent ? <option value="student">My attendance</option> : null}
              {!isStudent ? (
                <>
                  <option value="university">Institution attendance</option>
                  <option value="course">Course attendance</option>
                  <option value="risk">Risk report</option>
                </>
              ) : null}
            </select>
          </label>
          {!isStudent ? (
            <label className="grid gap-2 text-sm font-medium">
              Course for course report
              <select className={dashboardFormControlClassName} name="courseId">
                <option value="">Select course</option>
                {courses.data?.courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input name="courseId" type="hidden" value="" />
          )}
          <label className="grid gap-2 text-sm font-medium">
            From
            <input
              className={dashboardDateControlClassName}
              defaultValue={filters.from}
              name="from"
              required
              type="date"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            To
            <input
              className={dashboardDateControlClassName}
              defaultValue={filters.to}
              name="to"
              required
              type="date"
            />
          </label>
          <Button type="submit">Generate live report</Button>
        </form>
      </Card>

      {report.isLoading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : report.isError ? (
        <div className="mt-8">
          <ErrorState
            title="Unable to generate report"
            description="Confirm the filters and retry. Course reports require a selected course."
            retry={() => void report.refetch()}
          />
        </div>
      ) : report.data ? (
        <>
          <Card className="mt-8 p-5" tone="green">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <Badge tone="success">Live data</Badge>
                <CardHeader
                  className="mt-3"
                  icon={<FileChartColumnIncreasing size={20} />}
                  title={report.data.title}
                  tone="green"
                />
                <p className="mt-1 text-sm font-medium">{report.data.branding.displayName}</p>
                <p className="mt-1 text-sm text-slate-500">Report ID: {report.data.reportId}</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Generated {new Date(report.data.generatedAt).toLocaleString()}</p>
                <p className="mt-1">
                  Period: {String(report.data.filters.from)} to {String(report.data.filters.to)}
                </p>
                <p className="mt-1 font-mono text-xs">
                  Verified: {report.data.verification.checksum.slice(0, 16)}…
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    disabled={Boolean(exporting)}
                    onClick={() => void exportReport('pdf', report.data.reportId)}
                    variant="download"
                  >
                    <Download aria-hidden="true" size={16} /> PDF
                  </Button>
                  <Button
                    disabled={Boolean(exporting)}
                    onClick={() => void exportReport('xlsx', report.data.reportId)}
                    variant="excel"
                  >
                    <FileSpreadsheet aria-hidden="true" size={16} /> Excel
                  </Button>
                  <Button
                    disabled={Boolean(exporting)}
                    onClick={() => void exportReport('csv', report.data.reportId)}
                    variant="csv"
                  >
                    <FileText aria-hidden="true" size={16} /> CSV
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          <section className="mt-5 grid gap-5 md:grid-cols-3">
            <MetricCard
              icon={<CalendarClock aria-hidden="true" size={19} />}
              label="Sessions"
              tone="violet"
              value={report.data.summary.totalSessions}
            />
            <MetricCard
              icon={<ShieldCheck aria-hidden="true" size={19} />}
              label="Verified check-ins"
              tone="blue"
              value={report.data.summary.totalCheckIns}
            />
            <MetricCard
              icon={<TrendingUp aria-hidden="true" size={19} />}
              label="Average attendance"
              tone={
                report.data.summary.averageAttendance >= 75
                  ? 'green'
                  : report.data.summary.averageAttendance >= 60
                    ? 'gold'
                    : 'rose'
              }
              value={`${report.data.summary.averageAttendance}%`}
            />
          </section>
          <section className="mt-8">
            {report.data.rows.length ? (
              <DataTable
                caption={`${report.data.title} rows`}
                columns={[
                  {
                    id: 'student',
                    header: 'Student',
                    cell: (row) => (
                      <span className="flex flex-wrap items-center gap-2">
                        <span>{row.studentName}</span>
                        <IdentifierBadge tone="violet">{row.registrationNumber}</IdentifierBadge>
                      </span>
                    ),
                    tone: 'navy',
                  },
                  {
                    id: 'course',
                    header: 'Course',
                    cell: (row) => (
                      <span className="flex flex-wrap items-center gap-2">
                        <IdentifierBadge tone="blue">{row.courseCode}</IdentifierBadge>
                        <span>{row.courseTitle}</span>
                      </span>
                    ),
                    tone: 'blue',
                  },
                  {
                    id: 'sessions',
                    header: 'Sessions',
                    cell: (row) => `${row.sessionsAttended}/${row.sessionsHeld}`,
                    tone: (row) => (row.sessionsAttended > 0 ? 'green' : 'gold'),
                  },
                  {
                    id: 'attendance',
                    header: 'Attendance',
                    cell: (row) => <PercentageValue value={row.attendanceRate} />,
                  },
                  {
                    id: 'required',
                    header: 'Required',
                    cell: (row) => <PercentageValue value={row.requiredAttendance} />,
                  },
                  {
                    id: 'risk',
                    header: 'Risk',
                    cell: (row) => <RiskBadge level={row.riskLevel} />,
                  },
                ]}
                rows={report.data.rows}
                rowTone={(row) =>
                  row.attendanceRate >= row.requiredAttendance
                    ? 'green'
                    : row.attendanceRate >= 60
                      ? 'gold'
                      : 'rose'
                }
              />
            ) : (
              <EmptyState
                title="No report rows"
                description="No approved registrations matched the selected report filters."
              />
            )}
          </section>
          {report.data.pagination.pages > 1 ? (
            <div className="mt-6 flex items-center justify-between gap-4">
              <Button
                disabled={filters.page === 1}
                onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))}
                variant="secondary"
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {filters.page} of {report.data.pagination.pages}
              </span>
              <Button
                disabled={filters.page >= report.data.pagination.pages}
                onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </DashboardLayout>
  );
}
