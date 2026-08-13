import { Badge, Button, Card, EmptyState, ErrorState, PercentageValue, Skeleton } from '@qr/ui';
import { Download, FileCheck2, FileSpreadsheet, Printer, Share2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { apiErrorMessage } from '../auth/auth-utils.js';
import {
  downloadClearance,
  printClearance,
  shareClearance,
  useClearanceArchive,
  useEligibility,
  useGenerateClearance,
} from './use-clearance.js';

function decisionLabel(value: 'eligible' | 'not_eligible' | 'pending'): string {
  return value === 'eligible' ? 'Eligible' : value === 'pending' ? 'Pending' : 'Not eligible';
}

function decisionTone(value: 'eligible' | 'not_eligible' | 'pending') {
  return value === 'eligible'
    ? ('success' as const)
    : value === 'pending'
      ? ('warning' as const)
      : ('danger' as const);
}

interface CourseFeedback {
  readonly message: string;
  readonly tone: 'success' | 'error';
}

export default function ClearancePage() {
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.role === 'student';
  const eligibility = useEligibility(isStudent);
  const archive = useClearanceArchive(Boolean(user));
  const generate = useGenerateClearance();
  const [action, setAction] = useState('');
  const [archiveFeedback, setArchiveFeedback] = useState('');
  const [courseFeedback, setCourseFeedback] = useState<Record<string, CourseFeedback>>({});
  const [generatedReports, setGeneratedReports] = useState<Record<string, string>>({});

  const updateCourseFeedback = (courseId: string, value?: CourseFeedback) => {
    setCourseFeedback((current) => {
      if (value) return { ...current, [courseId]: value };
      const next = { ...current };
      delete next[courseId];
      return next;
    });
  };

  if (!user)
    return (
      <DashboardLayout>
        <ErrorState title="Your session has ended" description="Sign in to access clearance." />
      </DashboardLayout>
    );

  const exportReport = async (
    reportId: string,
    format: 'pdf' | 'xlsx' | 'csv' | 'print',
    courseId?: string,
  ) => {
    setAction(`${reportId}:${format}`);
    if (courseId) updateCourseFeedback(courseId);
    else setArchiveFeedback('');
    try {
      if (format === 'print') await printClearance(reportId);
      else await downloadClearance(reportId, format);
      const message =
        format === 'print'
          ? 'The professional PDF print document opened in a new tab.'
          : `${format.toUpperCase()} download prepared successfully.`;
      if (courseId) updateCourseFeedback(courseId, { message, tone: 'success' });
      else setArchiveFeedback(message);
      await archive.refetch();
    } catch (error) {
      const message = apiErrorMessage(error, 'The document could not be prepared. Please retry.');
      if (courseId) updateCourseFeedback(courseId, { message, tone: 'error' });
      else setArchiveFeedback(message);
    } finally {
      setAction('');
    }
  };
  const shareReport = async (reportId: string) => {
    setAction(`${reportId}:share`);
    setArchiveFeedback('');
    try {
      const result = await shareClearance(reportId);
      setArchiveFeedback(
        result === 'shared' ? 'Verification link shared.' : 'Verification link copied.',
      );
    } catch (error) {
      setArchiveFeedback(
        apiErrorMessage(error, 'The verification link could not be shared. Please retry.'),
      );
    } finally {
      setAction('');
    }
  };
  const generateReport = async (courseId: string) => {
    setAction(`${courseId}:generate`);
    updateCourseFeedback(courseId);
    try {
      const report = await generate.mutateAsync(courseId);
      setGeneratedReports((current) => ({ ...current, [courseId]: report.reportId }));
      updateCourseFeedback(courseId, {
        message: 'Approved clearance generated. Choose Download PDF or Print PDF below.',
        tone: 'success',
      });
      await archive.refetch();
    } catch (error) {
      updateCourseFeedback(courseId, {
        message: apiErrorMessage(error, 'Clearance could not be generated. Please retry.'),
        tone: 'error',
      });
    } finally {
      setAction('');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-white">
          <ShieldCheck aria-hidden="true" size={22} />
        </span>
        <div>
          <p className="text-sm font-semibold text-primary">Server-verified examination access</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Attendance clearance</h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
            Eligibility is recalculated from completed attendance sessions. Any attendance change
            expires earlier reports automatically.
          </p>
        </div>
      </div>

      {isStudent ? (
        <section className="mt-8" aria-labelledby="eligibility-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold" id="eligibility-heading">
              Exam eligibility
            </h2>
            <span className="text-xs text-slate-500">Live attendance data</span>
          </div>
          {eligibility.isLoading ? (
            <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((value) => (
                <Skeleton className="h-64" key={value} />
              ))}
            </div>
          ) : eligibility.isError ? (
            <ErrorState
              title="Eligibility unavailable"
              description="Live attendance could not be calculated. Please retry."
              retry={() => void eligibility.refetch()}
            />
          ) : eligibility.data?.length ? (
            <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
              {eligibility.data.map((course) => (
                <Card
                  className="self-start overflow-hidden"
                  data-testid="clearance-course-card"
                  key={course.registrationId}
                  tone={
                    course.attendancePercentage >= 75
                      ? 'green'
                      : course.attendancePercentage >= 60
                        ? 'gold'
                        : 'rose'
                  }
                >
                  <div className="border-b border-border bg-emerald-950 px-5 py-4 text-white dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{course.courseCode}</p>
                        <h3 className="mt-1 font-semibold">{course.courseTitle}</h3>
                      </div>
                      <Badge
                        className="!rounded-lg px-3 py-1.5 shadow-sm ring-1 ring-current/20"
                        tone={decisionTone(course.decision)}
                      >
                        {decisionLabel(course.decision)}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Attendance</p>
                        <PercentageValue
                          className="mt-1 block text-4xl"
                          value={course.attendancePercentage}
                        />
                      </div>
                      <p className="text-right text-sm text-slate-500">
                        Required
                        <br />
                        <PercentageValue value={course.requiredPercentage} />
                      </p>
                    </div>
                    <div
                      aria-label={`${course.attendancePercentage}% attendance`}
                      className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={course.attendancePercentage}
                    >
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${course.attendancePercentage}%` }}
                      />
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                      {[
                        ['Present', course.present, 'text-emerald-700 dark:text-emerald-300'],
                        ['Absent', course.absent, 'text-rose-700 dark:text-rose-300'],
                        ['Streak', course.currentStreak, 'text-violet-700 dark:text-violet-300'],
                      ].map(([label, value, colour], index) => (
                        <div
                          className={`rounded-xl border p-3 ${
                            index === 0
                              ? 'border-emerald-200 bg-emerald-100/80 dark:border-emerald-800 dark:bg-emerald-950/60'
                              : index === 1
                                ? 'border-rose-200 bg-rose-100/80 dark:border-rose-800 dark:bg-rose-950/60'
                                : 'border-violet-200 bg-violet-100/80 dark:border-violet-800 dark:bg-violet-950/60'
                          }`}
                          key={label}
                        >
                          <p className={`font-bold ${colour}`}>{value}</p>
                          <p className="mt-1 text-xs text-slate-500">{label}</p>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="mt-5 w-full gap-2"
                      disabled={course.decision !== 'eligible' || Boolean(action)}
                      onClick={() => void generateReport(course.courseId)}
                    >
                      <FileCheck2 aria-hidden="true" size={17} />
                      Generate approved clearance
                    </Button>
                    {generatedReports[course.courseId] ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          aria-label="Download generated clearance PDF"
                          className="gap-2"
                          disabled={Boolean(action)}
                          onClick={() =>
                            void exportReport(
                              generatedReports[course.courseId] ?? '',
                              'pdf',
                              course.courseId,
                            )
                          }
                          variant="download"
                        >
                          <Download aria-hidden="true" size={16} /> Download PDF
                        </Button>
                        <Button
                          aria-label="Print generated clearance PDF"
                          className="gap-2"
                          disabled={Boolean(action)}
                          onClick={() =>
                            void exportReport(
                              generatedReports[course.courseId] ?? '',
                              'print',
                              course.courseId,
                            )
                          }
                          variant="print"
                        >
                          <Printer aria-hidden="true" size={16} /> Print PDF
                        </Button>
                      </div>
                    ) : null}
                    {courseFeedback[course.courseId] ? (
                      <p
                        className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
                          courseFeedback[course.courseId]?.tone === 'success'
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200'
                        }`}
                        role={
                          courseFeedback[course.courseId]?.tone === 'success' ? 'status' : 'alert'
                        }
                      >
                        {courseFeedback[course.courseId]?.message}
                      </p>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No approved course registrations"
              description="Approved registrations will appear here for live eligibility calculation."
            />
          )}
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="archive-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" id="archive-heading">
              Report archive
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Versioned reports with download and print history.
            </p>
          </div>
          {archiveFeedback ? (
            <p className="text-sm font-medium text-primary" role="status">
              {archiveFeedback}
            </p>
          ) : null}
        </div>
        {archive.isLoading ? (
          <Skeleton className="h-60" />
        ) : archive.isError ? (
          <ErrorState
            title="Archive unavailable"
            description="Stored clearance reports could not be loaded."
            retry={() => void archive.refetch()}
          />
        ) : archive.data?.items.length ? (
          <div className="grid gap-4">
            {archive.data.items.map((report) => (
              <Card className="p-5" key={report.id}>
                <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          report.status === 'valid'
                            ? 'success'
                            : report.status === 'expired'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {report.status}
                      </Badge>
                      <span className="text-xs text-slate-500">Version {report.version}</span>
                    </div>
                    <h3 className="mt-3 font-bold">
                      {report.courseCode} - {report.courseTitle}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {report.reportId} · {report.attendancePercentage}% attendance · Issued{' '}
                      {new Date(report.issuedAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {report.downloadCount} downloads · {report.printCount} prints · Checksum{' '}
                      {report.checksum.slice(0, 12)}…
                    </p>
                    {report.revokedReason ? (
                      <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                        {report.revokedReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      aria-label={`Download ${report.reportId} as PDF`}
                      className="gap-2"
                      disabled={Boolean(action)}
                      onClick={() => void exportReport(report.reportId, 'pdf')}
                      variant="download"
                    >
                      <Download size={16} /> Download PDF
                    </Button>
                    <Button
                      aria-label={`Download ${report.reportId} as Excel`}
                      className="gap-2"
                      disabled={Boolean(action)}
                      onClick={() => void exportReport(report.reportId, 'xlsx')}
                      variant="excel"
                    >
                      <FileSpreadsheet size={16} /> Excel
                    </Button>
                    <Button
                      aria-label={`Download ${report.reportId} as CSV`}
                      disabled={Boolean(action)}
                      onClick={() => void exportReport(report.reportId, 'csv')}
                      variant="csv"
                    >
                      CSV
                    </Button>
                    <Button
                      aria-label={`Share ${report.reportId} verification link`}
                      className="gap-2"
                      disabled={Boolean(action)}
                      onClick={() => void shareReport(report.reportId)}
                      variant="share"
                    >
                      <Share2 size={16} /> Share
                    </Button>
                    <Button
                      aria-label={`Print ${report.reportId}`}
                      className="gap-2"
                      disabled={Boolean(action)}
                      onClick={() => void exportReport(report.reportId, 'print')}
                      variant="print"
                    >
                      <Printer size={16} /> Print PDF
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No clearance reports"
            description="Eligible students can generate one approved report per course version."
          />
        )}
      </section>
    </DashboardLayout>
  );
}
