import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttendanceQrMode } from '@qr/types';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  MetricCard,
  Skeleton,
} from '@qr/ui';
import type { AxiosError } from 'axios';
import { BookOpenCheck, CalendarClock, ScanLine } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { dashboardFormControlClassName } from '../../components/dashboard-form-control.js';
import { StatusBadge } from '../../components/status-badge.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { LecturerInsightsPanel } from '../analytics/lecturer-insights-panel.js';
import { CheckInQr } from '../attendance/check-in-qr.js';
import { QrSessionControls, StaticQrExportActions } from '../attendance/qr-session-controls.js';
import {
  downloadStaticQrPng,
  printStaticQr,
  type StaticQrPosterMetadata,
} from '../attendance/static-qr-poster.js';
import { EventDashboardPanel } from '../events/event-dashboard-panel.js';
import { useInstitutionSettings } from '../settings/use-institution-settings.js';
import { EngagementDashboardPanel } from './engagement-dashboard-panel.js';

interface LecturerCourse {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly attendanceRequirement: number;
}

interface AttendanceSession {
  readonly id: string;
  readonly course: { readonly code: string; readonly title: string } | null;
  readonly openedAt: string;
  readonly closesAt: string;
  readonly closedAt?: string;
  readonly status: 'open' | 'closed';
  readonly checkInCode?: string;
  readonly qrToken?: string;
  readonly qrMode: AttendanceQrMode;
  readonly qrRotatedAt: string;
  readonly qrRotationSeconds: number;
  readonly gpsRequired: boolean;
  readonly faceVerificationRequired: boolean;
  readonly attendanceCount: number;
}

interface LecturerWorkspace {
  readonly courses: readonly LecturerCourse[];
  readonly sessions: readonly AttendanceSession[];
}

interface Envelope<T> {
  readonly data: T;
}

interface SessionInput {
  readonly courseId: string;
  readonly durationMinutes: number;
  readonly qrMode: AttendanceQrMode;
  readonly qrRotationSeconds: number;
  readonly gpsRequired: boolean;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly maximumRadiusMetres: number;
  readonly faceVerificationRequired: boolean;
}

function errorMessage(error: unknown): string {
  return (
    (error as AxiosError<{ message?: string }>).response?.data.message ??
    'The attendance session could not be opened.'
  );
}

function QrCountdown({
  rotatedAt,
  seconds,
}: {
  readonly rotatedAt: string;
  readonly seconds: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(
    0,
    Math.ceil((new Date(rotatedAt).getTime() + seconds * 1000 - now) / 1000),
  );
  return (
    <span aria-live="polite" className="font-medium text-primary">
      QR refreshes in {remaining}s
    </span>
  );
}

function lecturerPosition(): Promise<{ latitude: number; longitude: number }> {
  if (!('geolocation' in navigator))
    return Promise.reject(new Error('This device does not support venue location capture.'));
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error('Allow precise location access to enable GPS verification.')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 },
    ),
  );
}

export default function LecturerWorkspacePage() {
  const user = useAuthStore((state) => state.user);
  const client = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [qrImageSource, setQrImageSource] = useState('');
  const [exportError, setExportError] = useState('');
  const institutionSettings = useInstitutionSettings(Boolean(user));
  const workspace = useQuery({
    queryKey: ['attendance', 'lecturer'],
    enabled: user?.role === 'lecturer',
    refetchInterval: 5_000,
    queryFn: async () =>
      (await apiClient.get<Envelope<LecturerWorkspace>>('/attendance/lecturer')).data.data,
  });
  const startSession = useMutation({
    mutationFn: async (body: SessionInput) => apiClient.post('/attendance/sessions', body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['attendance', 'lecturer'] });
      setSessionError('');
      setDialogOpen(false);
    },
    onError: (error) => setSessionError(errorMessage(error)),
  });
  const closeSession = useMutation({
    mutationFn: async (sessionId: string) =>
      apiClient.patch(`/attendance/sessions/${sessionId}/close`),
    onSuccess: async () => client.invalidateQueries({ queryKey: ['attendance', 'lecturer'] }),
  });

  if (!user)
    return (
      <DashboardLayout>
        <ErrorState title="Your session has ended" description="Sign in to manage attendance." />
      </DashboardLayout>
    );
  if (user.role !== 'lecturer')
    return (
      <DashboardLayout>
        <ErrorState
          title="Access restricted"
          description="This workspace is assigned to lecturers."
        />
      </DashboardLayout>
    );

  const activeSession = workspace.data?.sessions.find((session) => session.status === 'open');
  const totalAttendance =
    workspace.data?.sessions.reduce((total, session) => total + session.attendanceCount, 0) ?? 0;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const courseId = values.get('courseId');
    const duration = values.get('durationMinutes');
    const qrMode = values.get('qrMode');
    const rotation = values.get('qrRotationSeconds');
    const radius = values.get('maximumRadiusMetres');
    const gpsRequired = values.get('gpsRequired') === 'on';
    const faceVerificationRequired = values.get('faceVerificationRequired') === 'on';
    if (
      typeof courseId !== 'string' ||
      typeof duration !== 'string' ||
      (qrMode !== 'static' && qrMode !== 'rotating') ||
      typeof rotation !== 'string' ||
      typeof radius !== 'string'
    )
      return;
    void (async () => {
      try {
        setSessionError('');
        const location = gpsRequired ? await lecturerPosition() : undefined;
        startSession.mutate({
          courseId,
          durationMinutes: Number(duration),
          qrMode,
          qrRotationSeconds: Number(rotation),
          gpsRequired,
          ...location,
          maximumRadiusMetres: Number(radius),
          faceVerificationRequired,
        });
      } catch (error) {
        setSessionError(error instanceof Error ? error.message : 'Venue location was unavailable.');
      }
    })();
  };

  const staticMetadata = activeSession
    ? ({
        checkInWindow: `${new Date(activeSession.openedAt).toLocaleString('en-NG')} – ${new Date(activeSession.closesAt).toLocaleString('en-NG')}`,
        course: `${activeSession.course?.code ?? 'Class'} — ${activeSession.course?.title ?? 'Attendance session'}`,
        institution:
          institutionSettings.data?.institutionName ?? 'Institution attendance operations',
        lecturer: user.fullName,
        ...(institutionSettings.data?.logoUrl ? { logoUrl: institutionSettings.data.logoUrl } : {}),
      } satisfies StaticQrPosterMetadata)
    : undefined;

  const runExport = async (operation: () => Promise<void> | void) => {
    try {
      setExportError('');
      await operation();
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'The QR export could not be created.',
      );
    }
  };

  const downloadPdf = async () => {
    if (!activeSession) return;
    const response = await apiClient.get<Blob>(`/attendance/sessions/${activeSession.id}/qr.pdf`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.download = `attendity-${activeSession.course?.code ?? 'class'}-attendance-qr.pdf`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">{user.fullName}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Lecturer workspace</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Open secure QR sessions and monitor attendance as students check in.
          </p>
        </div>
        <Button
          disabled={!workspace.data?.courses.length || Boolean(activeSession)}
          onClick={() => setDialogOpen(true)}
        >
          Start class attendance
        </Button>
      </div>

      {workspace.isLoading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : workspace.isError ? (
        <div className="mt-8">
          <ErrorState
            title="Unable to load lecturer workspace"
            description="Please retry your request."
            retry={() => void workspace.refetch()}
          />
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-5 md:grid-cols-3">
            <MetricCard
              icon={<BookOpenCheck aria-hidden="true" size={19} />}
              label="Assigned courses"
              supportingText="Courses available for lecturer attendance"
              tone="navy"
              value={workspace.data?.courses.length ?? 0}
            />
            <MetricCard
              icon={<CalendarClock aria-hidden="true" size={19} />}
              label="Sessions created"
              supportingText="Attendance sessions in your current record"
              tone="violet"
              value={workspace.data?.sessions.length ?? 0}
            />
            <MetricCard
              icon={<ScanLine aria-hidden="true" size={19} />}
              label="Recorded check-ins"
              supportingText="Verified student attendance across sessions"
              tone="green"
              value={totalAttendance}
            />
          </section>

          {activeSession?.checkInCode && activeSession.qrToken ? (
            <Card className="mt-8 grid gap-6 p-6 lg:grid-cols-[400px_1fr] lg:items-center">
              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
                <CheckInQr onReady={setQrImageSource} value={activeSession.qrToken} />
                <p className="mt-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {new Date(activeSession.openedAt).toLocaleDateString('en-NG')} ·{' '}
                  {new Date(activeSession.openedAt).toLocaleTimeString('en-NG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  –{' '}
                  {new Date(activeSession.closesAt).toLocaleTimeString('en-NG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success">Live session</Badge>
                  <Badge tone={activeSession.qrMode === 'static' ? 'warning' : 'info'}>
                    {activeSession.qrMode === 'static' ? 'Static QR' : 'Rotating QR'}
                  </Badge>
                </div>
                <h2 className="mt-3 text-2xl font-bold">
                  {activeSession.course?.code} — {activeSession.course?.title}
                </h2>
                <p className="mt-3 text-slate-600 dark:text-slate-300">
                  Students can scan this QR code or enter the code below before the session closes.
                </p>
                <p className="mt-5 font-mono text-3xl font-bold tracking-widest text-primary">
                  {activeSession.checkInCode}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                  <span>{activeSession.attendanceCount} check-ins</span>
                  <span>Closes {new Date(activeSession.closesAt).toLocaleTimeString()}</span>
                  {activeSession.qrMode === 'rotating' ? (
                    <QrCountdown
                      rotatedAt={activeSession.qrRotatedAt}
                      seconds={activeSession.qrRotationSeconds}
                    />
                  ) : (
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      Fixed until the check-in window closes
                    </span>
                  )}
                  <Button
                    disabled={closeSession.isPending}
                    onClick={() => closeSession.mutate(activeSession.id)}
                    variant="danger"
                  >
                    Close session
                  </Button>
                </div>
                <div className="mt-5">
                  <StaticQrExportActions
                    mode={activeSession.qrMode}
                    onDownloadPdf={() => void runExport(downloadPdf)}
                    onDownloadPng={() =>
                      void runExport(() =>
                        staticMetadata && qrImageSource
                          ? downloadStaticQrPng(qrImageSource, staticMetadata)
                          : Promise.reject(new Error('The QR image is still being prepared.')),
                      )
                    }
                    onPrint={() =>
                      void runExport(() => {
                        if (!staticMetadata || !qrImageSource)
                          throw new Error('The QR image is still being prepared.');
                        printStaticQr(qrImageSource, staticMetadata);
                      })
                    }
                    ready={Boolean(qrImageSource && staticMetadata)}
                  />
                  {exportError ? (
                    <p className="mt-3 text-sm font-medium text-danger" role="alert">
                      {exportError}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={activeSession.gpsRequired ? 'info' : 'neutral'}>
                    GPS {activeSession.gpsRequired ? 'required' : 'not required'}
                  </Badge>
                  <Badge tone={activeSession.faceVerificationRequired ? 'info' : 'neutral'}>
                    Face {activeSession.faceVerificationRequired ? 'required' : 'not required'}
                  </Badge>
                </div>
              </div>
            </Card>
          ) : null}

          <LecturerInsightsPanel />
          <EventDashboardPanel management />
          <EngagementDashboardPanel management />

          <section className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Recent sessions</h2>
            {workspace.data?.sessions.length ? (
              <DataTable
                caption="Recent lecturer attendance sessions"
                columns={[
                  {
                    id: 'course',
                    header: 'Course',
                    cell: (row) =>
                      `${row.course?.code ?? 'Unavailable'} — ${row.course?.title ?? ''}`,
                    tone: 'blue',
                  },
                  {
                    id: 'opened',
                    header: 'Opened',
                    cell: (row) => new Date(row.openedAt).toLocaleString(),
                    tone: 'teal',
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (row) => <StatusBadge label={row.status} status={row.status} />,
                  },
                  {
                    id: 'attendance',
                    header: 'Check-ins',
                    cell: (row) => row.attendanceCount,
                    tone: (row) => (row.attendanceCount > 0 ? 'green' : 'gold'),
                  },
                ]}
                rows={workspace.data.sessions}
                rowTone={(row) => (row.status === 'open' ? 'green' : 'rose')}
              />
            ) : (
              <EmptyState
                title="No attendance sessions yet"
                description={
                  workspace.data?.courses.length
                    ? 'Start a session when your class is ready to check in.'
                    : 'An administrator must assign at least one course to your account.'
                }
              />
            )}
          </section>
        </>
      )}

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Start class attendance"
        footer={
          <Button disabled={startSession.isPending} form="session-create" type="submit">
            Open session
          </Button>
        }
      >
        <form className="grid gap-4" id="session-create" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Course
            <select className={dashboardFormControlClassName} name="courseId" required>
              <option value="">Select assigned course</option>
              {workspace.data?.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Check-in window
            <select
              className={dashboardFormControlClassName}
              defaultValue="15"
              name="durationMinutes"
            >
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">120 minutes</option>
              <option value="180">180 minutes</option>
            </select>
          </label>
          <QrSessionControls />
          <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-100/65 p-4 text-sm dark:border-blue-800 dark:bg-blue-950/50">
            <input className="mt-0.5 size-4 accent-primary" name="gpsRequired" type="checkbox" />
            <span>
              <span className="block font-medium">Require GPS verification</span>
              <span className="mt-1 block text-slate-500">
                Your current location becomes the attendance venue when the session opens.
              </span>
            </span>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Maximum GPS radius
            <select
              className={dashboardFormControlClassName}
              defaultValue="50"
              name="maximumRadiusMetres"
            >
              {[10, 20, 30, 50, 100].map((radius) => (
                <option key={radius} value={radius}>
                  {radius} metres
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-100/65 p-4 text-sm dark:border-violet-800 dark:bg-violet-950/50">
            <input
              className="mt-0.5 size-4 accent-primary"
              name="faceVerificationRequired"
              type="checkbox"
            />
            <span>
              <span className="block font-medium">Require face verification</span>
              <span className="mt-1 block text-slate-500">
                Available only when the institution biometric provider is configured.
              </span>
            </span>
          </label>
          {sessionError ? <p className="text-sm text-danger">{sessionError}</p> : null}
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
