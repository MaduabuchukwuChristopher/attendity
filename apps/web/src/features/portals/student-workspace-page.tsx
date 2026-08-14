import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  IdentifierBadge,
  PercentageValue,
  ProgressMeter,
  Skeleton,
  buttonClassName,
} from '@qr/ui';
import type { AxiosError } from 'axios';
import {
  BadgeCheck,
  CircleAlert,
  CircleCheckBig,
  Info,
  Keyboard,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { dashboardFormControlClassName } from '../../components/dashboard-form-control.js';
import { StatusBadge } from '../../components/status-badge.js';
import { AttendanceHistory } from '../attendance/attendance-history.js';
import { FaceCapture } from '../attendance/face-capture.js';
import { QrScanner } from '../attendance/qr-scanner.js';
import { currentPosition } from '../attendance/device-verification.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { RiskBadge } from '../analytics/risk-badge.js';
import { EventDashboardPanel } from '../events/event-dashboard-panel.js';
import { useMyAttendanceRisk } from '../analytics/use-analytics.js';
import { EngagementDashboardPanel } from './engagement-dashboard-panel.js';
import { StudentAnalyticsPanel } from '../analytics/student-analytics-panel.js';

interface CourseProgress {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly attendanceRequirement: number;
  readonly sessionsHeld: number;
  readonly sessionsAttended: number;
  readonly attendancePercentage: number;
  readonly eligible: boolean;
}

interface TimelineRecord {
  readonly id: string;
  readonly course: { readonly code: string; readonly title: string } | null;
  readonly checkedInAt: string;
  readonly status: 'present';
  readonly gpsVerified: boolean;
  readonly faceVerified: boolean;
}

interface StudentWorkspace {
  readonly registrationNumber: string | null;
  readonly courses: readonly CourseProgress[];
  readonly timeline: readonly TimelineRecord[];
  readonly heatmap: Readonly<Record<string, number>>;
  readonly faceProfile: { readonly configured: boolean; readonly enrolled: boolean };
}

interface AttendanceCredential {
  readonly code?: string;
  readonly token?: string;
}

interface Requirements {
  readonly gpsRequired: boolean;
  readonly faceVerificationRequired: boolean;
  readonly faceProfileEnrolled: boolean;
  readonly closesAt: string;
}

interface Envelope<T> {
  readonly data: T;
}

type FeedbackSource = 'scanner' | 'manual';
type FeedbackTone = 'success' | 'error' | 'info';

interface CheckInFeedbackState {
  readonly source: FeedbackSource;
  readonly message: string;
  readonly tone: FeedbackTone;
}

const feedbackClasses = {
  error:
    'border-red-200 bg-red-50 text-red-900 shadow-red-950/5 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100',
  info: 'border-blue-200 bg-blue-50 text-blue-900 shadow-blue-950/5 dark:border-blue-800 dark:bg-blue-950/80 dark:text-blue-100',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-emerald-950/5 dark:border-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-100',
} as const;

function CheckInFeedback({ feedback }: { readonly feedback?: CheckInFeedbackState | undefined }) {
  if (!feedback) return null;
  const Icon =
    feedback.tone === 'success' ? CircleCheckBig : feedback.tone === 'error' ? CircleAlert : Info;
  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm ${feedbackClasses[feedback.tone]}`}
      role={feedback.tone === 'error' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
      <span>{feedback.message}</span>
    </div>
  );
}

function apiError(error: unknown, fallback: string): string {
  const response = (error as AxiosError<{ message?: string }>).response;
  return response?.data.message ?? fallback;
}

export default function StudentWorkspacePage() {
  const user = useAuthStore((state) => state.user);
  const client = useQueryClient();
  const [feedback, setFeedback] = useState<CheckInFeedbackState>();
  const [profileMessage, setProfileMessage] = useState('');
  const [successNotification, setSuccessNotification] = useState('');
  const [pending, setPending] = useState<
    { credential: AttendanceCredential; gpsRequired: boolean; source: FeedbackSource } | undefined
  >();
  const [showEnrolment, setShowEnrolment] = useState(false);
  const workspace = useQuery({
    queryKey: ['attendance', 'student'],
    enabled: user?.role === 'student',
    refetchInterval: 60_000,
    queryFn: async () =>
      (await apiClient.get<Envelope<StudentWorkspace>>('/attendance/student')).data.data,
  });
  const attendanceRisk = useMyAttendanceRisk(user?.role === 'student');
  const checkIn = useMutation({
    mutationFn: async (input: {
      readonly credential: AttendanceCredential;
      readonly gpsRequired: boolean;
      readonly imageCapture?: string;
      readonly source: FeedbackSource;
    }) =>
      apiClient.post('/attendance/check-in', {
        ...input.credential,
        gps: await currentPosition(input.gpsRequired),
        imageCapture: input.imageCapture,
      }),
    onMutate: ({ source }) =>
      setFeedback({ source, message: 'Recording your verified attendance…', tone: 'info' }),
    onSuccess: async (_response, { source }) => {
      setPending(undefined);
      const message = 'Attendance recorded successfully.';
      setFeedback({ source, message, tone: 'success' });
      setSuccessNotification(message);
      await client.invalidateQueries({ queryKey: ['attendance', 'student'] });
      await client.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (error, { source }) =>
      setFeedback({
        source,
        message: apiError(error, 'Check-in failed. Please try again.'),
        tone: 'error',
      }),
  });
  const prepare = useMutation({
    mutationFn: async ({
      credential,
    }: {
      credential: AttendanceCredential;
      source: FeedbackSource;
    }) =>
      (
        await apiClient.post<Envelope<Requirements>>(
          '/attendance/check-in/requirements',
          credential,
        )
      ).data.data,
    onMutate: ({ source }) => {
      setSuccessNotification('');
      setFeedback({ source, message: 'Verifying this attendance credential…', tone: 'info' });
    },
    onSuccess: (requirements, { credential, source }) => {
      if (requirements.faceVerificationRequired) {
        if (!requirements.faceProfileEnrolled) {
          setFeedback({
            source,
            message: 'Enrol your face profile below before using this attendance session.',
            tone: 'info',
          });
          return;
        }
        setPending({ credential, gpsRequired: requirements.gpsRequired, source });
        setFeedback({
          source,
          message: 'Complete the live face check to record attendance.',
          tone: 'info',
        });
        return;
      }
      checkIn.mutate({ credential, gpsRequired: requirements.gpsRequired, source });
    },
    onError: (error, { source }) =>
      setFeedback({
        source,
        message: apiError(error, 'The attendance code could not be verified.'),
        tone: 'error',
      }),
  });
  const enrolFace = useMutation({
    mutationFn: (imageCapture: string) =>
      apiClient.post('/attendance/face-profile', { imageCapture }),
    onSuccess: async () => {
      setShowEnrolment(false);
      setProfileMessage('Your face profile was enrolled securely.');
      await client.invalidateQueries({ queryKey: ['attendance', 'student'] });
    },
    onError: (error) =>
      setProfileMessage(apiError(error, 'Your face profile could not be enrolled. Please retry.')),
  });

  useEffect(() => {
    if (!successNotification) return undefined;
    const timer = window.setTimeout(() => setSuccessNotification(''), 5_000);
    return () => window.clearTimeout(timer);
  }, [successNotification]);

  if (!user)
    return (
      <DashboardLayout>
        <ErrorState title="Your session has ended" description="Sign in to view attendance." />
      </DashboardLayout>
    );
  if (user.role !== 'student')
    return (
      <DashboardLayout>
        <ErrorState
          title="Access restricted"
          description="This workspace is assigned to students."
        />
      </DashboardLayout>
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('code');
    if (typeof value === 'string')
      prepare.mutate({
        credential: { code: value.trim().toUpperCase() },
        source: 'manual',
      });
  };
  const scan = (value: string) =>
    prepare.mutate({
      credential: value.startsWith('v1.') ? { token: value } : { code: value.toUpperCase() },
      source: 'scanner',
    });
  const courses = workspace.data?.courses ?? [];
  const timeline = workspace.data?.timeline ?? [];
  const scannerFeedback = feedback?.source === 'scanner' ? feedback : undefined;
  const manualFeedback = feedback?.source === 'manual' ? feedback : undefined;

  return (
    <DashboardLayout>
      <p className="text-sm font-semibold text-primary">{user.fullName}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Student attendance</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Check in to live classes and track examination eligibility.
      </p>

      <Card className="mt-6 flex flex-col gap-4 border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-white">
          <ShieldCheck aria-hidden="true" size={22} />
        </span>
        <div className="flex-1">
          <h2 className="font-bold">Prepare for examination check-in</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Review eligibility, generate a server-verified clearance record, then download or print
            its PDF for your examiner.
          </p>
        </div>
        <Link className={buttonClassName('primary')} to="/app/clearance">
          Attendance clearance
        </Link>
      </Card>

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-2">
        <QrScanner
          feedback={<CheckInFeedback feedback={scannerFeedback} />}
          onScan={scan}
          tone="green"
        />
        <Card
          aria-label="Manual check-in card"
          className="relative self-start overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-100 p-5 shadow-lg shadow-amber-950/5 dark:border-amber-800 dark:from-amber-950 dark:via-slate-950 dark:to-orange-950"
          role="region"
        >
          <form className="flex h-full flex-col justify-between gap-4" onSubmit={submit}>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500 text-slate-950 shadow-sm">
                <Keyboard aria-hidden="true" size={21} />
              </span>
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">Manual entry</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Use the lecturer's fallback code when camera scanning is unavailable.
                </p>
              </div>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Manual check-in code
              <input
                autoComplete="off"
                className={`${dashboardFormControlClassName} font-mono uppercase tracking-widest`}
                maxLength={32}
                minLength={8}
                name="code"
                placeholder="Enter the code shown by your lecturer"
                required
              />
            </label>
            <CheckInFeedback feedback={manualFeedback} />
            <Button disabled={prepare.isPending || checkIn.isPending} type="submit">
              Verify and check in
            </Button>
          </form>
        </Card>
      </div>

      {pending ? (
        <div className="mt-5">
          <FaceCapture
            busy={checkIn.isPending}
            description="Take a live photo to compare with your enrolled profile. The capture is not stored by Attendity."
            onCapture={(imageCapture) => checkIn.mutate({ ...pending, imageCapture })}
            title="Complete face verification"
          />
        </div>
      ) : null}

      {workspace.isLoading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : workspace.isError ? (
        <div className="mt-8">
          <ErrorState
            title="Unable to load attendance progress"
            description="Please retry your request."
            retry={() => void workspace.refetch()}
          />
        </div>
      ) : (
        <>
          <StudentAnalyticsPanel courses={courses} />

          <Card className="mt-8 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck aria-hidden="true" size={22} />
                </span>
                <div>
                  <h2 className="font-semibold">Face profile</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {workspace.data?.faceProfile.configured
                      ? workspace.data.faceProfile.enrolled
                        ? 'Enrolled and ready for face-required sessions.'
                        : 'Set up once before attending a face-required session.'
                      : 'Face verification is not enabled for this deployment.'}
                  </p>
                </div>
              </div>
              {workspace.data?.faceProfile.enrolled ? (
                <Badge tone="success">Enrolled</Badge>
              ) : workspace.data?.faceProfile.configured ? (
                <Button onClick={() => setShowEnrolment((value) => !value)} variant="secondary">
                  {showEnrolment ? 'Cancel setup' : 'Set up face profile'}
                </Button>
              ) : (
                <Badge tone="neutral">Not configured</Badge>
              )}
            </div>
            {profileMessage ? (
              <p
                className={`mt-4 text-sm font-bold ${enrolFace.isError ? 'text-danger' : 'text-emerald-700 dark:text-emerald-300'}`}
                role={enrolFace.isError ? 'alert' : 'status'}
              >
                {profileMessage}
              </p>
            ) : null}
          </Card>
          {showEnrolment ? (
            <div className="mt-5">
              <FaceCapture
                busy={enrolFace.isPending}
                description="Capture a clear, front-facing image. The biometric provider returns only a secure profile reference to Attendity."
                onCapture={(imageCapture) => enrolFace.mutate(imageCapture)}
                title="Enrol face profile"
              />
            </div>
          ) : null}

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Course attendance</h2>
              {workspace.data?.registrationNumber ? (
                <IdentifierBadge tone="violet">{workspace.data.registrationNumber}</IdentifierBadge>
              ) : null}
            </div>
            {courses.length ? (
              <DataTable
                caption="Student course attendance progress"
                columns={[
                  {
                    id: 'code',
                    header: 'Course',
                    cell: (row) => (
                      <span className="flex flex-wrap items-center gap-2">
                        <IdentifierBadge tone="blue">{row.code}</IdentifierBadge>
                        <span>{row.title}</span>
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
                    cell: (row) => (
                      <ProgressMeter
                        label={`${row.code} attendance`}
                        value={row.attendancePercentage}
                      />
                    ),
                  },
                  {
                    id: 'requirement',
                    header: 'Required',
                    cell: (row) => <PercentageValue value={row.attendanceRequirement} />,
                  },
                  {
                    id: 'eligibility',
                    header: 'Exam status',
                    cell: (row) => (
                      <StatusBadge
                        label={
                          row.sessionsHeld === 0
                            ? 'Awaiting sessions'
                            : row.eligible
                              ? 'Eligible'
                              : 'At risk'
                        }
                        status={
                          row.sessionsHeld === 0
                            ? 'pending'
                            : row.eligible
                              ? 'eligible'
                              : 'not_eligible'
                        }
                      />
                    ),
                  },
                ]}
                rows={courses}
                rowTone={(row) =>
                  row.sessionsHeld === 0 ? 'blue' : row.eligible ? 'green' : 'rose'
                }
              />
            ) : (
              <EmptyState
                title="No approved courses yet"
                description="Approved course registrations will appear here automatically."
              />
            )}
          </section>

          <AttendanceHistory days={workspace.data?.heatmap ?? {}} />

          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Attendance risk and recommendations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Explainable projections based only on your completed lectures and recent pattern.
              </p>
            </div>
            {attendanceRisk.isLoading ? (
              <Skeleton className="h-40" />
            ) : attendanceRisk.isError ? (
              <ErrorState
                title="Risk analysis is temporarily unavailable"
                description="Your attendance records remain available above."
                retry={() => void attendanceRisk.refetch()}
              />
            ) : attendanceRisk.data?.length ? (
              <DataTable
                caption="Personal course attendance risk predictions"
                columns={[
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
                    cell: (row) => <PercentageValue value={row.projectedAttendance} />,
                  },
                  {
                    id: 'required',
                    header: 'Required',
                    cell: (row) => <PercentageValue value={row.requiredAttendance} />,
                  },
                  {
                    id: 'risk',
                    header: 'Risk',
                    cell: (row) => <RiskBadge level={row.level} />,
                  },
                  {
                    id: 'confidence',
                    header: 'Confidence',
                    cell: (row) => <PercentageValue value={row.confidence} />,
                  },
                  {
                    id: 'action',
                    header: 'Recommended action',
                    cell: (row) => row.recommendation,
                    tone: 'violet',
                  },
                ]}
                rows={attendanceRisk.data}
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
                title="No risk analysis yet"
                description="Risk predictions begin after at least one registered course has a completed lecture."
              />
            )}
          </section>

          <section className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Attendance timeline</h2>
            {timeline.length ? (
              <DataTable
                caption="Chronological student attendance history"
                columns={[
                  {
                    id: 'date',
                    header: 'Date and time',
                    cell: (row) => new Date(row.checkedInAt).toLocaleString(),
                    tone: 'teal',
                  },
                  {
                    id: 'course',
                    header: 'Course',
                    cell: (row) =>
                      row.course ? `${row.course.code} — ${row.course.title}` : 'Unavailable',
                    tone: 'blue',
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: () => <StatusBadge label="Present" status="present" />,
                  },
                  {
                    id: 'verification',
                    header: 'Verification',
                    cell: (row) =>
                      [row.gpsVerified ? 'GPS' : null, row.faceVerified ? 'Face' : null]
                        .filter(Boolean)
                        .join(' + ') || 'QR',
                    tone: 'green',
                  },
                ]}
                rows={timeline}
              />
            ) : (
              <EmptyState
                title="No attendance history yet"
                description="Successful attendance check-ins will create your timeline."
              />
            )}
          </section>

          <EventDashboardPanel />
          <EngagementDashboardPanel />
        </>
      )}
      {successNotification ? (
        <div
          aria-label="Attendance verified"
          className="fixed inset-x-4 bottom-4 z-50 flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-950 px-4 py-4 text-white shadow-2xl shadow-emerald-950/30 sm:left-auto sm:right-6 sm:max-w-sm dark:border-emerald-600 dark:bg-emerald-900"
          role="status"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-400 text-emerald-950">
            <BadgeCheck aria-hidden="true" size={23} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">Attendance verified</p>
            <p className="mt-1 text-sm font-semibold text-emerald-100">{successNotification}</p>
          </div>
          <button
            aria-label="Dismiss attendance confirmation"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-emerald-100 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            onClick={() => setSuccessNotification('')}
            type="button"
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
