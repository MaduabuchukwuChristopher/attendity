import { ROLE_PERMISSIONS } from '@qr/shared';
import type { EventParticipant, EventParticipationRecord, EventSummary } from '@qr/types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ComparisonBarChart,
  DataTable,
  Dialog,
  DonutChart,
  EmptyState,
  ErrorState,
  Input,
  MetricCard,
  PercentageValue,
  SemanticValue,
  Skeleton,
  TrendChart,
} from '@qr/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  CalendarDays,
  Archive,
  BarChart3,
  Building2,
  ChartPie,
  Clock3,
  Download,
  Fingerprint,
  Gauge,
  MapPin,
  Percent,
  Plus,
  Pencil,
  Printer,
  ShieldAlert,
  ShieldX,
  Sparkles,
  Users,
  UserCheck,
  UserRoundCheck,
  UserRoundX,
  XCircle,
} from 'lucide-react';
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { apiClient } from '../../api/client.js';
import { FormActionFeedback } from '../../components/form-action-feedback.js';
import { StatusBadge } from '../../components/status-badge.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { CheckInQr } from '../attendance/check-in-qr.js';
import { currentPosition } from '../attendance/device-verification.js';
import { FaceCapture } from '../attendance/face-capture.js';
import { QrScanner } from '../attendance/qr-scanner.js';
import { EventEditor } from './event-editor.js';
import {
  useEventAnalytics,
  useEventHistory,
  useEventParticipants,
  useEvents,
  useManagedEvents,
  type EventFilters,
  type EventAnalyticsFilters,
  type EventHistoryFilters,
} from './use-events.js';

type View = 'upcoming' | 'timeline' | 'table' | 'calendar' | 'manage';
interface Credential {
  readonly code?: string;
  readonly token?: string;
  readonly pin?: string;
}
interface Requirements {
  readonly gpsRequired: boolean;
  readonly faceVerificationRequired: boolean;
  readonly faceProfileEnrolled: boolean;
  readonly closesAt: string;
}
interface SessionResult {
  readonly id: string;
  readonly checkInCode?: string;
  readonly qrToken?: string;
  readonly closesAt: string;
}
interface Envelope<T> {
  readonly data: T;
}

function errorMessage(error: unknown, fallback: string): string {
  return (error as AxiosError<{ message?: string }>).response?.data.message ?? fallback;
}

function tone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (['present', 'completed', 'active', 'registered'].includes(status)) return 'success';
  if (['late', 'pending', 'scheduled', 'invited'].includes(status)) return 'warning';
  if (['absent', 'cancelled', 'rejected'].includes(status)) return 'danger';
  if (status === 'excused') return 'info';
  return 'neutral';
}

function label(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function downloadHistory(items: readonly EventParticipationRecord[]) {
  const rows = [
    [
      'Event',
      'Type',
      'Organizer',
      'Venue',
      'Academic session',
      'Term',
      'Date',
      'Mandatory',
      'Status',
      'Check-in',
      'Methods',
      'GPS verified',
      'Face verified',
    ],
    ...items.map((item) => [
      item.eventTitle,
      label(item.eventType),
      item.organizerName,
      item.venue,
      item.academicSession?.name ?? '',
      item.term?.name ?? '',
      item.startsAt,
      item.mandatory ? 'Yes' : 'No',
      label(item.status),
      item.checkedInAt ?? '',
      item.methods.map(label).join(' + '),
      item.gpsVerified ? 'Yes' : 'No',
      item.faceVerified ? 'Yes' : 'No',
    ]),
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'attendity-event-participation.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadAnalytics(
  eventId: string,
  format: 'csv' | 'xlsx' | 'pdf',
  filters: EventAnalyticsFilters,
) {
  const query = new URLSearchParams({
    ...(filters.from ? { from: new Date(`${filters.from}T00:00:00.000Z`).toISOString() } : {}),
    ...(filters.to ? { to: new Date(`${filters.to}T23:59:59.999Z`).toISOString() } : {}),
  });
  const response = await apiClient.get<Blob>(
    `/events/${eventId}/analytics/export/${format}?${query.toString()}`,
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `attendity-event-analytics.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function EventCard({
  event,
  actions,
}: {
  readonly event: EventSummary;
  readonly actions?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      {event.bannerUrl ? (
        <img alt="" className="h-36 w-full object-cover" src={event.bannerUrl} />
      ) : null}
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={tone(event.status)}>{label(event.status)}</Badge>
              <Badge tone="info">{label(event.eventType)}</Badge>
              {event.mandatory ? <Badge tone="danger">Mandatory</Badge> : <Badge>Optional</Badge>}
            </div>
            <h2 className="mt-3 text-xl font-bold">{event.title}</h2>
          </div>
          {event.participationStatus ? (
            <Badge tone={tone(event.participationStatus)}>{label(event.participationStatus)}</Badge>
          ) : null}
        </div>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {event.description}
        </p>
        <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" size={16} />{' '}
            {new Date(event.startsAt).toLocaleString()}
          </p>
          <p className="flex items-center gap-2">
            <MapPin aria-hidden="true" size={16} /> {event.venue}
            {event.campus ? ` · ${event.campus}` : ''}
          </p>
          <p className="flex items-center gap-2">
            <Users aria-hidden="true" size={16} /> Organized by {event.organizerName}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {event.attendanceMethods.map((method) => (
            <Badge key={method}>{label(method)}</Badge>
          ))}
        </div>
        {actions ? (
          <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-4 dark:border-slate-700">
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export default function EventsPage() {
  const user = useAuthStore((state) => state.user);
  const { notify } = useDashboardToast();
  const client = useQueryClient();
  const canManage = Boolean(user && ROLE_PERMISSIONS[user.role].includes('events:write'));
  const [view, setView] = useState<View>('upcoming');
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    status: 'all',
    eventType: 'all',
    mandatory: 'all',
    page: 1,
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventSummary>();
  const [cancellingEvent, setCancellingEvent] = useState<EventSummary>();
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [checkInEvent, setCheckInEvent] = useState<EventSummary>();
  const [pendingFace, setPendingFace] = useState<{
    readonly eventId: string;
    readonly credential: Credential;
    readonly gpsRequired: boolean;
  }>();
  const [activeSession, setActiveSession] = useState<{
    readonly event: EventSummary;
    readonly session: SessionResult;
  }>();
  const announce = useCallback(
    (nextMessage: string, nextTone: 'success' | 'error' = 'success') => {
      setMessage(nextMessage);
      setMessageTone(nextTone);
      notify({
        tone: nextTone,
        title: nextTone === 'success' ? 'Event updated' : 'Event action failed',
        message: nextMessage,
      });
    },
    [notify],
  );
  const [analyticsEventId, setAnalyticsEventId] = useState<string>();
  const [analyticsFilters, setAnalyticsFilters] = useState<EventAnalyticsFilters>({
    from: '',
    to: '',
  });
  const [participantEvent, setParticipantEvent] = useState<EventSummary>();
  const [participantFilters, setParticipantFilters] = useState({
    search: '',
    status: 'all',
    page: 1,
  });
  const [participantAction, setParticipantAction] = useState<{
    readonly type: 'manual' | 'excuse';
    readonly participant: EventParticipant;
  }>();
  const [historyFilters, setHistoryFilters] = useState<EventHistoryFilters>({
    academicSessionId: '',
    termId: '',
    eventType: 'all',
    mandatory: 'all',
    status: 'all',
    page: 1,
  });
  const events = useEvents(filters);
  const managed = useManagedEvents(filters, canManage);
  const history = useEventHistory(historyFilters, Boolean(user));
  const analytics = useEventAnalytics(analyticsEventId, analyticsFilters, canManage);
  const participants = useEventParticipants(participantEvent?.id, participantFilters, canManage);

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['events'] }),
      client.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
  };
  const saveEvent = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editingEvent
        ? apiClient.patch<Envelope<EventSummary>>(`/events/${editingEvent.id}`, body)
        : apiClient.post<Envelope<EventSummary>>('/events', body),
    onSuccess: async () => {
      setEditorOpen(false);
      setEditingEvent(undefined);
      announce(
        editingEvent
          ? 'Event changes saved and participants were updated.'
          : 'Event draft created. Review it, then publish when ready.',
      );
      await refresh();
    },
    onError: (error) => announce(errorMessage(error, 'The event could not be saved.'), 'error'),
  });
  const publish = useMutation({
    mutationFn: (eventId: string) => apiClient.post(`/events/${eventId}/publish`),
    onSuccess: async () => {
      announce('Event published and its audience was notified.');
      await refresh();
    },
    onError: (error) => announce(errorMessage(error, 'The event could not be published.'), 'error'),
  });
  const register = useMutation({
    mutationFn: (eventId: string) => apiClient.post(`/events/${eventId}/register`),
    onSuccess: async () => {
      announce('Your event registration is confirmed.');
      await refresh();
    },
    onError: (error) =>
      announce(errorMessage(error, 'Registration could not be completed.'), 'error'),
  });
  const openAttendance = useMutation({
    mutationFn: async (event: EventSummary) => ({
      event,
      session: (
        await apiClient.post<Envelope<SessionResult>>(`/events/${event.id}/attendance/open`, {
          durationMinutes: 60,
        })
      ).data.data,
    }),
    onSuccess: ({ event, session }) => {
      setActiveSession({ event, session });
      announce('Event attendance is now open.');
    },
    onError: (error) =>
      announce(errorMessage(error, 'Event attendance could not be opened.'), 'error'),
  });
  const closeAttendance = useMutation({
    mutationFn: ({
      eventId,
      sessionId,
    }: {
      readonly eventId: string;
      readonly sessionId: string;
    }) => apiClient.patch(`/events/${eventId}/attendance/${sessionId}/close`),
    onSuccess: async () => {
      setActiveSession(undefined);
      announce('Event attendance is now closed.');
      await refresh();
    },
    onError: (error) =>
      announce(errorMessage(error, 'Event attendance could not be closed.'), 'error'),
  });
  const cancelEvent = useMutation({
    mutationFn: ({ eventId, reason }: { readonly eventId: string; readonly reason: string }) =>
      apiClient.post(`/events/${eventId}/cancel`, { reason }),
    onSuccess: async () => {
      setCancellingEvent(undefined);
      announce('Event cancelled and targeted participants were notified.');
      await refresh();
    },
    onError: (error) => announce(errorMessage(error, 'The event could not be cancelled.'), 'error'),
  });
  const archiveEvent = useMutation({
    mutationFn: (eventId: string) => apiClient.post(`/events/${eventId}/archive`),
    onSuccess: async () => {
      announce('Event archived successfully.');
      await refresh();
    },
    onError: (error) => announce(errorMessage(error, 'The event could not be archived.'), 'error'),
  });
  const updateParticipant = useMutation({
    mutationFn: async ({
      type,
      participant,
      status,
      reason,
    }: {
      readonly type: 'manual' | 'excuse';
      readonly participant: EventParticipant;
      readonly status?: string;
      readonly reason: string;
    }): Promise<void> => {
      if (!participantEvent) throw new Error('Select an event first.');
      if (type === 'excuse') {
        await apiClient.post(
          `/events/${participantEvent.id}/participants/${participant.userId}/excuse`,
          { reason },
        );
      } else {
        await apiClient.post(`/events/${participantEvent.id}/attendance/manual`, {
          userId: participant.userId,
          status,
          reason,
        });
      }
    },
    onSuccess: async () => {
      setParticipantAction(undefined);
      announce('The participant record was updated with a complete audit entry.');
      await refresh();
    },
    onError: (error) =>
      announce(errorMessage(error, 'The participant record could not be updated.'), 'error'),
  });
  const checkIn = useMutation({
    mutationFn: async (input: {
      readonly eventId: string;
      readonly credential: Credential;
      readonly gpsRequired: boolean;
      readonly imageCapture?: string;
    }) =>
      apiClient.post(`/events/${input.eventId}/attendance/check-in`, {
        ...input.credential,
        gps: await currentPosition(input.gpsRequired),
        imageCapture: input.imageCapture,
      }),
    onSuccess: async () => {
      setPendingFace(undefined);
      setCheckInEvent(undefined);
      announce('Event attendance recorded successfully.');
      await refresh();
    },
    onError: (error) =>
      announce(errorMessage(error, 'Event check-in could not be completed.'), 'error'),
  });
  const prepare = useMutation({
    mutationFn: async ({
      eventId,
      credential,
    }: {
      readonly eventId: string;
      readonly credential: Credential;
    }) => ({
      eventId,
      credential,
      requirements: (
        await apiClient.post<Envelope<Requirements>>(
          `/events/${eventId}/attendance/requirements`,
          credential,
        )
      ).data.data,
    }),
    onSuccess: ({ eventId, credential, requirements }) => {
      if (requirements.faceVerificationRequired) {
        if (!requirements.faceProfileEnrolled) {
          announce('Set up your face profile from Student Attendance before checking in.', 'error');
          return;
        }
        setPendingFace({ eventId, credential, gpsRequired: requirements.gpsRequired });
        return;
      }
      checkIn.mutate({ eventId, credential, gpsRequired: requirements.gpsRequired });
    },
    onError: (error) =>
      announce(errorMessage(error, 'The event credential could not be verified.'), 'error'),
  });

  const calendar = useMemo(() => {
    const groups = new Map<string, EventParticipationRecord[]>();
    for (const record of history.data?.items ?? []) {
      const day = record.startsAt.slice(0, 10);
      groups.set(day, [...(groups.get(day) ?? []), record]);
    }
    return [...groups].sort(([left], [right]) => left.localeCompare(right));
  }, [history.data?.items]);

  if (!user)
    return (
      <DashboardLayout>
        <ErrorState title="Your session has ended" description="Sign in to view events." />
      </DashboardLayout>
    );
  const feed = events.data?.items ?? [];
  const records = history.data?.items ?? [];
  const views: readonly { readonly id: View; readonly label: string }[] = [
    { id: 'upcoming', label: 'Events' },
    { id: 'timeline', label: 'My timeline' },
    { id: 'table', label: 'My records' },
    { id: 'calendar', label: 'Calendar' },
    ...(canManage ? [{ id: 'manage' as const, label: 'Manage events' }] : []),
  ];

  const credentialForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!checkInEvent) return;
    const value = new FormData(event.currentTarget).get('credential');
    if (typeof value !== 'string' || !value.trim()) return;
    const normalized = value.trim();
    const credential = normalized.startsWith('v1.')
      ? { token: normalized }
      : /^\d{6,10}$/.test(normalized)
        ? { pin: normalized }
        : { code: normalized.toUpperCase() };
    prepare.mutate({ eventId: checkInEvent.id, credential });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Institution engagement</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Events</h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
            Discover campus activities, complete secure event attendance, and keep mandatory
            participation separate from course eligibility.
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              setEditingEvent(undefined);
              setEditorOpen(true);
            }}
          >
            <Plus size={17} /> Create event
          </Button>
        ) : null}
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Event views">
        {views.map((item) => (
          <button
            aria-selected={view === item.id}
            className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold ${view === item.id ? 'bg-primary text-white' : 'border border-border bg-surface dark:border-slate-700 dark:bg-dark-surface'}`}
            key={item.id}
            onClick={() => setView(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <FormActionFeedback
          message={message || undefined}
          status={message ? messageTone : 'idle'}
        />
      </div>

      {view === 'upcoming' || view === 'calendar' || view === 'manage' ? (
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className="sr-only">Search events</span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.currentTarget.value,
                  page: 1,
                }))
              }
              placeholder="Search events, venues, or topics"
              type="search"
              value={filters.search}
            />
          </label>
          <select
            aria-label="Mandatory status"
            className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                mandatory: event.currentTarget.value,
                page: 1,
              }))
            }
            value={filters.mandatory}
          >
            <option value="all">All requirements</option>
            <option value="true">Mandatory</option>
            <option value="false">Optional</option>
          </select>
          <select
            aria-label="Event status"
            className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.currentTarget.value, page: 1 }))
            }
            value={filters.status}
          >
            <option value="all">All statuses</option>
            {['draft', 'scheduled', 'active', 'completed', 'cancelled', 'archived'].map(
              (status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ),
            )}
          </select>
        </div>
      ) : null}

      {['timeline', 'table', 'calendar'].includes(view) ? (
        <Card className="mt-6 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <select
              aria-label="Academic session"
              className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setHistoryFilters((current) => ({
                  ...current,
                  academicSessionId: event.currentTarget.value,
                  termId: '',
                  page: 1,
                }))
              }
              value={historyFilters.academicSessionId}
            >
              <option value="">All academic sessions</option>
              {(history.data?.filterOptions.academicSessions ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Semester or term"
              className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setHistoryFilters((current) => ({
                  ...current,
                  termId: event.currentTarget.value,
                  page: 1,
                }))
              }
              value={historyFilters.termId}
            >
              <option value="">All semesters or terms</option>
              {(history.data?.filterOptions.terms ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Event category"
              className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setHistoryFilters((current) => ({
                  ...current,
                  eventType: event.currentTarget.value,
                  page: 1,
                }))
              }
              value={historyFilters.eventType}
            >
              <option value="all">All event categories</option>
              {[
                'orientation',
                'seminar',
                'workshop',
                'conference',
                'meeting',
                'ceremony',
                'sports',
                'social',
                'other',
              ].map((eventType) => (
                <option key={eventType} value={eventType}>
                  {label(eventType)}
                </option>
              ))}
            </select>
            <select
              aria-label="Mandatory requirement"
              className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setHistoryFilters((current) => ({
                  ...current,
                  mandatory: event.currentTarget.value,
                  page: 1,
                }))
              }
              value={historyFilters.mandatory}
            >
              <option value="all">All requirements</option>
              <option value="true">Mandatory</option>
              <option value="false">Optional</option>
            </select>
            <select
              aria-label="Attendance status"
              className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setHistoryFilters((current) => ({
                  ...current,
                  status: event.currentTarget.value,
                  page: 1,
                }))
              }
              value={historyFilters.status}
            >
              <option value="all">All attendance statuses</option>
              {['pending', 'present', 'late', 'absent', 'excused', 'rejected'].map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </div>
        </Card>
      ) : null}

      {view === 'upcoming' ? (
        events.isLoading ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        ) : events.isError ? (
          <div className="mt-6">
            <ErrorState
              title="Events are temporarily unavailable"
              description="Please retry the event feed."
              retry={() => void events.refetch()}
            />
          </div>
        ) : feed.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {feed.map((event) => (
              <EventCard
                actions={
                  <>
                    {event.registrationRequired && event.registrationStatus !== 'registered' ? (
                      <Button onClick={() => register.mutate(event.id)} variant="secondary">
                        Register
                      </Button>
                    ) : null}
                    {event.status === 'active' &&
                    !['present', 'late'].includes(event.participationStatus ?? '') ? (
                      <Button onClick={() => setCheckInEvent(event)}>Check in</Button>
                    ) : null}
                  </>
                }
                event={event}
                key={event.id}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="No matching events"
              description="Published events assigned to your role and academic scope will appear here."
            />
          </div>
        )
      ) : null}

      {view === 'timeline' ? (
        <section className="mt-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <MetricCard
              icon={<Users aria-hidden="true" size={20} />}
              label="Participation"
              tone="blue"
              value={history.data?.total ?? 0}
            />
            <MetricCard
              icon={<UserRoundCheck aria-hidden="true" size={20} />}
              label="Mandatory attended"
              tone="green"
              value={history.data?.mandatoryAttended ?? 0}
            />
            <MetricCard
              icon={<UserRoundX aria-hidden="true" size={20} />}
              label="Mandatory missed"
              tone="rose"
              value={history.data?.mandatoryMissed ?? 0}
            />
            <MetricCard
              icon={<UserCheck aria-hidden="true" size={20} />}
              label="Optional attended"
              tone="violet"
              value={history.data?.optionalAttended ?? 0}
            />
          </div>
          <div className="mt-6 grid gap-4">
            {records.length ? (
              records.map((record) => (
                <Card
                  className="relative overflow-hidden p-5 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:bg-primary"
                  key={record.id}
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="font-bold">{record.eventTitle}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(record.startsAt).toLocaleString()} · {record.organizerName} ·{' '}
                        {record.venue}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {[
                          record.academicSession?.name,
                          record.term?.name,
                          record.checkedInAt
                            ? `Checked in ${new Date(record.checkedInAt).toLocaleTimeString()}`
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge tone={tone(record.status)}>{label(record.status)}</Badge>
                      {record.mandatory ? <Badge tone="danger">Mandatory</Badge> : null}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <EmptyState
                title="No event participation yet"
                description="Your invitations and verified attendance will build this timeline."
              />
            )}
          </div>
        </section>
      ) : null}

      {view === 'table' ? (
        <section className="mt-6">
          <div className="mb-4 flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Event participation record</h2>
              <p className="text-sm text-slate-500">
                This report remains separate from course attendance percentages.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!records.length}
                onClick={() => downloadHistory(records)}
                variant="csv"
              >
                <Download size={16} /> CSV
              </Button>
              <Button onClick={() => window.print()} variant="print">
                <Printer size={16} /> Print
              </Button>
            </div>
          </div>
          {records.length ? (
            <DataTable
              caption="Personal event attendance records"
              columns={[
                { id: 'event', header: 'Event', cell: (row) => row.eventTitle, tone: 'navy' },
                {
                  id: 'date',
                  header: 'Date',
                  cell: (row) => new Date(row.startsAt).toLocaleDateString(),
                  tone: 'teal',
                },
                {
                  id: 'type',
                  header: 'Type',
                  cell: (row) => label(row.eventType),
                  tone: 'violet',
                },
                {
                  id: 'period',
                  header: 'Academic period',
                  cell: (row) =>
                    [row.academicSession?.name, row.term?.name].filter(Boolean).join(' · ') ||
                    'Not assigned',
                  tone: 'teal',
                },
                {
                  id: 'organizer',
                  header: 'Organizer',
                  cell: (row) => row.organizerName,
                  tone: 'navy',
                },
                {
                  id: 'requirement',
                  header: 'Requirement',
                  cell: (row) =>
                    row.mandatory ? (
                      <Badge tone="danger">Mandatory</Badge>
                    ) : (
                      <Badge>Optional</Badge>
                    ),
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (row) => <StatusBadge label={label(row.status)} status={row.status} />,
                },
                {
                  id: 'verification',
                  header: 'Verification',
                  cell: (row) => (
                    <div>
                      <p>{row.methods.map(label).join(' + ') || 'Not recorded'}</p>
                      {row.checkedInAt ? (
                        <p className="text-xs text-slate-500">
                          {new Date(row.checkedInAt).toLocaleTimeString()}
                        </p>
                      ) : null}
                    </div>
                  ),
                  tone: 'green',
                },
              ]}
              rows={records}
            />
          ) : (
            <EmptyState
              title="No event records"
              description="Verified participation records will appear here."
            />
          )}
        </section>
      ) : null}

      {view === 'calendar' ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {calendar.length ? (
            calendar.map(([day, dayRecords]) => (
              <Card className="p-5" key={day}>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div className="mt-4 grid gap-3">
                  {dayRecords.map((record) => (
                    <div
                      className="rounded-xl border border-teal-200 bg-teal-100/65 p-3 dark:border-teal-800 dark:bg-teal-950/50"
                      key={record.id}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{record.eventTitle}</p>
                        <Badge tone={tone(record.status)}>{label(record.status)}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(record.startsAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {record.venue}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No calendar events"
              description="Adjust your filters or check again after events are published."
            />
          )}
        </section>
      ) : null}

      {['timeline', 'table', 'calendar'].includes(view) &&
      history.data &&
      history.data.pagination.pages > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Page {history.data.pagination.page} of {history.data.pagination.pages} ·{' '}
            {history.data.pagination.total} records
          </p>
          <div className="flex gap-2">
            <Button
              disabled={historyFilters.page <= 1}
              onClick={() =>
                setHistoryFilters((current) => ({ ...current, page: current.page - 1 }))
              }
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={historyFilters.page >= history.data.pagination.pages}
              onClick={() =>
                setHistoryFilters((current) => ({ ...current, page: current.page + 1 }))
              }
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {view === 'manage' && canManage ? (
        <section className="mt-6">
          {managed.isLoading ? (
            <Skeleton className="h-96" />
          ) : managed.data?.items.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {managed.data.items.map((event) => (
                <EventCard
                  actions={
                    <>
                      <Button
                        disabled={
                          publish.isPending || !['draft', 'scheduled'].includes(event.status)
                        }
                        onClick={() => publish.mutate(event.id)}
                        variant="secondary"
                      >
                        Publish
                      </Button>
                      {['draft', 'scheduled'].includes(event.status) ? (
                        <Button
                          onClick={() => {
                            setEditingEvent(event);
                            setEditorOpen(true);
                          }}
                          variant="secondary"
                        >
                          <Pencil aria-hidden="true" size={16} /> Edit
                        </Button>
                      ) : null}
                      <Button
                        disabled={
                          !['scheduled', 'active'].includes(event.status) ||
                          Boolean(event.activeAttendanceSessionId)
                        }
                        onClick={() => openAttendance.mutate(event)}
                      >
                        Open event attendance
                      </Button>
                      {event.activeAttendanceSessionId ? (
                        <Button
                          onClick={() =>
                            closeAttendance.mutate({
                              eventId: event.id,
                              sessionId: event.activeAttendanceSessionId!,
                            })
                          }
                          variant="secondary"
                        >
                          Close attendance
                        </Button>
                      ) : null}
                      {!['completed', 'cancelled', 'archived'].includes(event.status) ? (
                        <Button onClick={() => setCancellingEvent(event)} variant="danger">
                          <XCircle aria-hidden="true" size={16} /> Cancel
                        </Button>
                      ) : null}
                      {['completed', 'cancelled'].includes(event.status) ? (
                        <Button onClick={() => archiveEvent.mutate(event.id)} variant="secondary">
                          <Archive aria-hidden="true" size={16} /> Archive
                        </Button>
                      ) : null}
                      <Button
                        onClick={() => {
                          setAnalyticsEventId(event.id);
                          setAnalyticsFilters({ from: '', to: '' });
                        }}
                        variant="secondary"
                      >
                        Analytics
                      </Button>
                      <Button
                        onClick={() => {
                          setParticipantEvent(event);
                          setParticipantFilters({ search: '', status: 'all', page: 1 });
                        }}
                        variant="secondary"
                      >
                        <Users aria-hidden="true" size={16} /> Participants
                      </Button>
                    </>
                  }
                  event={event}
                  key={event.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No managed events"
              description="Create the first event for your permitted institution scope."
            />
          )}
          {analyticsEventId ? (
            <Card className="mt-6 p-5" tone="teal">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardHeader
                  description="Live event intelligence"
                  icon={<BarChart3 size={20} />}
                  title="Attendance analytics"
                  tone="teal"
                />
                <div className="flex flex-wrap gap-2">
                  {(['csv', 'xlsx', 'pdf'] as const).map((format) => (
                    <Button
                      key={format}
                      onClick={() =>
                        void downloadAnalytics(analyticsEventId, format, analyticsFilters)
                      }
                      variant={format === 'csv' ? 'csv' : format === 'xlsx' ? 'excel' : 'download'}
                    >
                      <Download size={15} /> {format.toUpperCase()}
                    </Button>
                  ))}
                  <Button onClick={() => window.print()} variant="print">
                    <Printer size={15} /> Print
                  </Button>
                  <Button onClick={() => setAnalyticsEventId(undefined)} variant="secondary">
                    Close
                  </Button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  From date
                  <input
                    className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
                    max={analyticsFilters.to || undefined}
                    onChange={(event) =>
                      setAnalyticsFilters((current) => ({
                        ...current,
                        from: event.currentTarget.value,
                      }))
                    }
                    type="date"
                    value={analyticsFilters.from}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  To date
                  <input
                    className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
                    min={analyticsFilters.from || undefined}
                    onChange={(event) =>
                      setAnalyticsFilters((current) => ({
                        ...current,
                        to: event.currentTarget.value,
                      }))
                    }
                    type="date"
                    value={analyticsFilters.to}
                  />
                </label>
              </div>
              {analytics.isLoading ? (
                <Skeleton className="mt-5 h-40" />
              ) : analytics.isError ? (
                <div className="mt-5">
                  <ErrorState
                    title="Event analytics are unavailable"
                    description="Retry this tenant-scoped analytics request."
                    retry={() => void analytics.refetch()}
                  />
                </div>
              ) : analytics.data ? (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <MetricCard
                      className="p-4"
                      icon={<Users aria-hidden="true" size={18} />}
                      label="Invited"
                      tone="blue"
                      value={analytics.data.invited}
                    />
                    <MetricCard
                      className="p-4"
                      icon={<UserCheck aria-hidden="true" size={18} />}
                      label="Registered"
                      tone="violet"
                      value={analytics.data.registered}
                    />
                    <MetricCard
                      className="p-4"
                      icon={<UserRoundCheck aria-hidden="true" size={18} />}
                      label="Attended"
                      tone="green"
                      value={analytics.data.attended}
                    />
                    <MetricCard
                      className="p-4"
                      icon={<CalendarDays aria-hidden="true" size={18} />}
                      label="Late"
                      tone="gold"
                      value={analytics.data.late}
                    />
                    <MetricCard
                      className="p-4"
                      icon={<UserRoundX aria-hidden="true" size={18} />}
                      label="Absent"
                      tone="rose"
                      value={analytics.data.absent}
                    />
                    <MetricCard
                      className="p-4"
                      icon={<Percent aria-hidden="true" size={18} />}
                      label="Compliance"
                      tone={
                        analytics.data.mandatoryCompliance >= 75
                          ? 'green'
                          : analytics.data.mandatoryCompliance >= 60
                            ? 'gold'
                            : 'rose'
                      }
                      value={`${analytics.data.mandatoryCompliance}%`}
                    />
                  </div>
                  <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
                    Attendance rate: <PercentageValue value={analytics.data.attendanceRate} />.
                    Verification distribution:{' '}
                    {analytics.data.verificationMethods
                      .map((item) => `${label(item.method)} ${item.count}`)
                      .join(', ') || 'No check-ins yet'}
                    .
                  </p>
                  <div className="mt-6 grid gap-5 xl:grid-cols-2">
                    <Card className="p-4" tone="blue">
                      <CardHeader
                        icon={<Clock3 size={18} />}
                        level={3}
                        title="Attendance over time"
                        tone="blue"
                      />
                      <TrendChart
                        data={analytics.data.attendanceOverTime.map((item) => ({
                          label: new Date(item.period).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                          value: item.attendanceRate,
                        }))}
                        label="Cumulative event attendance rate over time"
                        valueLabel="Attendance rate"
                      />
                    </Card>
                    <Card className="p-4" tone="violet">
                      <CardHeader
                        icon={<ChartPie size={18} />}
                        level={3}
                        title="Verification distribution"
                        tone="violet"
                      />
                      <DonutChart
                        data={analytics.data.verificationMethods.map((item) => ({
                          label: label(item.method),
                          value: item.count,
                        }))}
                        label="Event attendance verification method distribution"
                      />
                    </Card>
                    <Card className="p-4" tone="green">
                      <CardHeader
                        icon={<Building2 size={18} />}
                        level={3}
                        title="Institution-unit attendance"
                        tone="green"
                      />
                      <ComparisonBarChart
                        data={analytics.data.attendanceByInstitutionUnit
                          .slice(0, 8)
                          .map((item) => ({ label: item.label, value: item.attendanceRate }))}
                        label="Attendance rate by institution unit"
                      />
                    </Card>
                    <Card className="p-4" tone="gold">
                      <CardHeader
                        icon={<Gauge size={18} />}
                        level={3}
                        title="Comparable events"
                        tone="gold"
                      />
                      <ComparisonBarChart
                        data={analytics.data.eventComparison.map((item) => ({
                          label: item.title,
                          value: item.attendanceRate,
                        }))}
                        label="Attendance rate comparison for similar events"
                      />
                    </Card>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    <MetricCard
                      className="p-4"
                      icon={<Clock3 aria-hidden="true" size={18} />}
                      label="Peak arrivals"
                      tone="teal"
                      value={
                        analytics.data.peakArrivalPeriod
                          ? `${new Date(analytics.data.peakArrivalPeriod.period).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${analytics.data.peakArrivalPeriod.count}`
                          : 'No data'
                      }
                    />
                    {(
                      [
                        ['GPS failures', analytics.data.verificationFailures.gps, MapPin],
                        ['Face failures', analytics.data.verificationFailures.face, UserRoundX],
                        [
                          'Credential failures',
                          analytics.data.verificationFailures.credential,
                          Fingerprint,
                        ],
                        [
                          'Duplicate attempts',
                          analytics.data.verificationFailures.duplicate,
                          XCircle,
                        ],
                        [
                          'Suspicious attempts',
                          analytics.data.verificationFailures.suspicious,
                          ShieldX,
                        ],
                      ] as const
                    ).map(([name, value, Icon]) => (
                      <MetricCard
                        className="p-4"
                        icon={<Icon aria-hidden="true" size={18} />}
                        key={name}
                        label={name}
                        tone={value === 0 ? 'green' : 'rose'}
                        value={value}
                      />
                    ))}
                  </div>
                  <div className="mt-6 grid gap-5 xl:grid-cols-2">
                    {[
                      ['Programme drill-down', analytics.data.attendanceByProgramme],
                      ['Level drill-down', analytics.data.attendanceByLevel],
                      ['Role drill-down', analytics.data.attendanceByRole],
                    ].map(([heading, rows]) => (
                      <Card className="p-4" key={heading as string}>
                        <h3 className="mb-4 font-bold">{heading as string}</h3>
                        <DataTable
                          caption={heading as string}
                          columns={[
                            {
                              id: 'group',
                              header: 'Group',
                              cell: (row) => row.label,
                              tone: 'navy',
                            },
                            {
                              id: 'invited',
                              header: 'Invited',
                              cell: (row) => row.invited,
                              tone: 'gold',
                            },
                            {
                              id: 'attended',
                              header: 'Attended',
                              cell: (row) => row.attended,
                              tone: 'green',
                            },
                            {
                              id: 'rate',
                              header: 'Rate',
                              cell: (row) => <PercentageValue value={row.attendanceRate} />,
                            },
                          ]}
                          rows={rows as typeof analytics.data.attendanceByProgramme}
                          rowTone={(row) =>
                            row.attendanceRate >= 75
                              ? 'green'
                              : row.attendanceRate >= 60
                                ? 'gold'
                                : 'rose'
                          }
                        />
                      </Card>
                    ))}
                    <Card className="p-4">
                      <h3 className="mb-4 font-bold">Semester participation summary</h3>
                      <DataTable
                        caption="Semester event participation summary"
                        columns={[
                          {
                            id: 'period',
                            header: 'Academic period',
                            cell: (row) => `${row.academicSession} · ${row.term}`,
                            tone: 'teal',
                          },
                          {
                            id: 'invited',
                            header: 'Invited',
                            cell: (row) => row.invited,
                            tone: 'gold',
                          },
                          {
                            id: 'attended',
                            header: 'Attended',
                            cell: (row) => row.attended,
                            tone: 'green',
                          },
                          {
                            id: 'rate',
                            header: 'Rate',
                            cell: (row) => <PercentageValue value={row.attendanceRate} />,
                          },
                        ]}
                        rows={analytics.data.semesterParticipation}
                        rowTone={(row) =>
                          row.attendanceRate >= 75
                            ? 'green'
                            : row.attendanceRate >= 60
                              ? 'gold'
                              : 'rose'
                        }
                      />
                    </Card>
                  </div>
                  <Card className="mt-6 p-4">
                    <h3 className="mb-4 font-bold">Check-in timeline</h3>
                    {analytics.data.checkInTimeline.length ? (
                      <DataTable
                        caption="Event check-in timeline"
                        columns={[
                          {
                            id: 'period',
                            header: 'Period',
                            cell: (row) => new Date(row.period).toLocaleString(),
                            tone: 'teal',
                          },
                          {
                            id: 'count',
                            header: 'Check-ins',
                            cell: (row) => row.count,
                            tone: (row) => (row.count > 0 ? 'green' : 'gold'),
                          },
                        ]}
                        rows={analytics.data.checkInTimeline}
                      />
                    ) : (
                      <EmptyState
                        title="No check-ins in this date range"
                        description="Verified arrivals will populate the real-time timeline."
                      />
                    )}
                  </Card>
                </>
              ) : null}
            </Card>
          ) : null}
        </section>
      ) : null}

      <Dialog
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingEvent ? `Edit ${editingEvent.title}` : 'Create institution event'}
      >
        <EventEditor
          {...(editingEvent ? { event: editingEvent } : {})}
          error={
            saveEvent.isError ? errorMessage(saveEvent.error, 'Unable to save event.') : undefined
          }
          onSubmit={(body) => saveEvent.mutate(body)}
          pending={saveEvent.isPending}
        />
      </Dialog>

      <Dialog
        footer={
          <Button
            disabled={cancelEvent.isPending}
            form="event-cancel-form"
            type="submit"
            variant="danger"
          >
            {cancelEvent.isPending ? 'Cancelling…' : 'Cancel event'}
          </Button>
        }
        isOpen={Boolean(cancellingEvent)}
        onClose={() => setCancellingEvent(undefined)}
        title="Cancel event"
      >
        <form
          className="grid gap-4"
          id="event-cancel-form"
          onSubmit={(formEvent) => {
            formEvent.preventDefault();
            if (!cancellingEvent) return;
            const reason = new FormData(formEvent.currentTarget).get('reason');
            if (typeof reason === 'string')
              cancelEvent.mutate({ eventId: cancellingEvent.id, reason });
          }}
        >
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Cancelling {cancellingEvent?.title} closes open attendance and notifies every targeted
            participant.
          </p>
          <Input label="Cancellation reason" maxLength={500} minLength={3} name="reason" required />
          {cancelEvent.isError ? (
            <p className="text-sm text-danger" role="alert">
              {errorMessage(cancelEvent.error, 'The event could not be cancelled.')}
            </p>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        isOpen={Boolean(participantEvent)}
        onClose={() => setParticipantEvent(undefined)}
        title={participantEvent ? `Participants · ${participantEvent.title}` : 'Event participants'}
      >
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              aria-label="Search event participants"
              className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setParticipantFilters((current) => ({
                  ...current,
                  search: event.currentTarget.value,
                  page: 1,
                }))
              }
              placeholder="Search name, email, or ID"
              type="search"
              value={participantFilters.search}
            />
            <select
              aria-label="Participation status"
              className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
              onChange={(event) =>
                setParticipantFilters((current) => ({
                  ...current,
                  status: event.currentTarget.value,
                  page: 1,
                }))
              }
              value={participantFilters.status}
            >
              <option value="all">All statuses</option>
              {['present', 'late', 'absent', 'excused', 'rejected', 'pending'].map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </div>
          {participants.isLoading ? (
            <Skeleton className="h-64" />
          ) : participants.isError ? (
            <ErrorState
              title="Participants unavailable"
              description="Retry this event participant request."
              retry={() => void participants.refetch()}
            />
          ) : participants.data?.items.length ? (
            <>
              <DataTable
                caption="Event participant management"
                columns={[
                  {
                    id: 'participant',
                    header: 'Participant',
                    cell: (row) => (
                      <div>
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-xs text-slate-500">{row.email}</p>
                      </div>
                    ),
                    tone: 'navy',
                  },
                  {
                    id: 'scope',
                    header: 'Scope',
                    cell: (row) =>
                      [row.role.replaceAll('_', ' '), row.programme, row.level]
                        .filter(Boolean)
                        .join(' · '),
                    tone: 'violet',
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (row) => (
                      <StatusBadge
                        label={label(row.participationStatus)}
                        status={row.participationStatus}
                      />
                    ),
                  },
                  {
                    id: 'verified',
                    header: 'Verification',
                    cell: (row) => row.verificationMethods.map(label).join(' + ') || 'Not recorded',
                    tone: 'green',
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (row) => (
                      <div className="flex flex-wrap gap-2">
                        {participantEvent?.manualAttendanceAllowed ? (
                          <Button
                            className="min-h-9 px-3"
                            onClick={() =>
                              setParticipantAction({ type: 'manual', participant: row })
                            }
                            variant="secondary"
                          >
                            Record
                          </Button>
                        ) : null}
                        <Button
                          className="min-h-9 px-3"
                          onClick={() => setParticipantAction({ type: 'excuse', participant: row })}
                          variant="secondary"
                        >
                          Excuse
                        </Button>
                      </div>
                    ),
                  },
                ]}
                rows={participants.data.items}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Page {participants.data.pagination.page} of {participants.data.pagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={participantFilters.page <= 1}
                    onClick={() =>
                      setParticipantFilters((current) => ({ ...current, page: current.page - 1 }))
                    }
                    variant="secondary"
                  >
                    Previous
                  </Button>
                  <Button
                    disabled={participantFilters.page >= participants.data.pagination.pages}
                    onClick={() =>
                      setParticipantFilters((current) => ({ ...current, page: current.page + 1 }))
                    }
                    variant="secondary"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No matching participants"
              description="Published event audience members will appear here."
            />
          )}
        </div>
      </Dialog>

      <Dialog
        footer={
          <Button
            disabled={updateParticipant.isPending}
            form="event-participant-action"
            type="submit"
          >
            {updateParticipant.isPending
              ? 'Saving…'
              : participantAction?.type === 'excuse'
                ? 'Approve excuse'
                : 'Record attendance'}
          </Button>
        }
        isOpen={Boolean(participantAction)}
        onClose={() => setParticipantAction(undefined)}
        title={
          participantAction?.type === 'excuse'
            ? 'Manage excused absence'
            : 'Record manual attendance'
        }
      >
        <form
          className="grid gap-4"
          id="event-participant-action"
          onSubmit={(formEvent) => {
            formEvent.preventDefault();
            if (!participantAction) return;
            const data = new FormData(formEvent.currentTarget);
            const reason = data.get('reason');
            const status = data.get('status');
            if (typeof reason === 'string')
              updateParticipant.mutate({
                ...participantAction,
                reason,
                ...(typeof status === 'string' ? { status } : {}),
              });
          }}
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Participant: <strong>{participantAction?.participant.name}</strong>
          </p>
          {participantAction?.type === 'manual' ? (
            <label className="grid gap-2 text-sm font-medium">
              Attendance status
              <select
                className="h-11 rounded-xl border border-border bg-surface px-3 dark:border-slate-700 dark:bg-dark-surface"
                name="status"
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="rejected">Rejected</option>
                <option value="excused">Excused</option>
              </select>
            </label>
          ) : null}
          <Input
            label={participantAction?.type === 'excuse' ? 'Excuse reason' : 'Administrative reason'}
            maxLength={500}
            minLength={3}
            name="reason"
            required
          />
          {updateParticipant.isError ? (
            <p className="text-sm text-danger" role="alert">
              {errorMessage(
                updateParticipant.error,
                'The participant record could not be updated.',
              )}
            </p>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        isOpen={Boolean(checkInEvent)}
        onClose={() => {
          setCheckInEvent(undefined);
          setPendingFace(undefined);
        }}
        title={`Check in${checkInEvent ? ` · ${checkInEvent.title}` : ''}`}
      >
        {checkInEvent ? (
          <div className="grid gap-5">
            <QrScanner
              description="Scan the event's encrypted dynamic QR. Camera frames remain on this device."
              onScan={(value) =>
                prepare.mutate({
                  eventId: checkInEvent.id,
                  credential: value.startsWith('v1.')
                    ? { token: value }
                    : { code: value.toUpperCase() },
                })
              }
              title="Scan event QR"
            />
            <form className="grid gap-3" onSubmit={credentialForm}>
              <label className="grid gap-2 text-sm font-medium">
                Event PIN or check-in code
                <input
                  autoComplete="off"
                  className="h-11 rounded-xl border border-border bg-surface px-3 font-mono tracking-widest dark:border-slate-700 dark:bg-dark-surface"
                  name="credential"
                  required
                />
              </label>
              <Button disabled={prepare.isPending || checkIn.isPending} type="submit">
                Verify and check in
              </Button>
            </form>
            {pendingFace ? (
              <FaceCapture
                busy={checkIn.isPending}
                description="Complete the configured live biometric check for this event."
                onCapture={(imageCapture) => checkIn.mutate({ ...pendingFace, imageCapture })}
                title="Face verification required"
              />
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        isOpen={Boolean(activeSession)}
        onClose={() => setActiveSession(undefined)}
        title={
          activeSession ? `Attendance open · ${activeSession.event.title}` : 'Event attendance'
        }
      >
        {activeSession ? (
          <div className="text-center">
            {activeSession.session.qrToken ? (
              <CheckInQr
                label="Live encrypted event attendance QR code"
                value={activeSession.session.qrToken}
              />
            ) : (
              <ShieldAlert className="mx-auto text-primary" size={48} />
            )}
            <p className="mt-4 text-sm text-slate-500">
              Closes {new Date(activeSession.session.closesAt).toLocaleTimeString()}
            </p>
            {activeSession.session.checkInCode ? (
              <SemanticValue
                className="mt-3 block font-mono text-2xl tracking-widest"
                tone="teal"
                value={activeSession.session.checkInCode}
              />
            ) : (
              <p className="mt-3 text-sm">
                Use the configured secure event PIN or manual attendance workflow.
              </p>
            )}
            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <Sparkles size={16} /> Updates appear in event analytics in real time.
            </div>
            <Button
              className="mt-5"
              disabled={closeAttendance.isPending}
              onClick={() =>
                closeAttendance.mutate({
                  eventId: activeSession.event.id,
                  sessionId: activeSession.session.id,
                })
              }
              variant="danger"
            >
              {closeAttendance.isPending ? 'Closing…' : 'Close attendance now'}
            </Button>
          </div>
        ) : null}
      </Dialog>
    </DashboardLayout>
  );
}
