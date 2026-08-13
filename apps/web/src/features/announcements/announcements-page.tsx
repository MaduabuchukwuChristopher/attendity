import { ROLE_PERMISSIONS } from '@qr/shared';
import type { AnnouncementDeliverySummary, AnnouncementSummary, ApiResponse } from '@qr/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  MetricCard,
  Skeleton,
} from '@qr/ui';
import {
  Archive,
  BellRing,
  CalendarClock,
  CheckCheck,
  Eye,
  FileText,
  Megaphone,
  Pencil,
  Pin,
  Plus,
  Send,
  Users,
  XCircle,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { apiErrorMessage } from '../auth/auth-utils.js';
import { AnnouncementEditor, type CourseOption } from './announcement-editor.js';
import {
  useAnnouncements,
  useManagedAnnouncements,
  type AnnouncementFilters,
} from './use-announcements.js';

const selectClass =
  'h-11 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-dark-surface';

function displayDate(value?: string): string {
  return value ? new Date(value).toLocaleString() : 'Not scheduled';
}

function AnnouncementCard({
  announcement,
  management,
  onOpen,
  onEdit,
  onAction,
}: {
  readonly announcement: AnnouncementSummary;
  readonly management: boolean;
  readonly onOpen: () => void;
  readonly onEdit: () => void;
  readonly onAction: (
    action: 'publish' | 'archive' | 'cancel' | 'pin' | 'schedule' | 'delivery',
  ) => void;
}) {
  const priorityTone =
    announcement.priority === 'urgent'
      ? 'border-l-danger'
      : announcement.priority === 'high'
        ? 'border-l-warning'
        : 'border-l-primary';
  return (
    <Card
      className={`border-l-4 ${priorityTone} p-5`}
      tone={
        announcement.priority === 'urgent'
          ? 'rose'
          : announcement.priority === 'high'
            ? 'gold'
            : 'blue'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{announcement.category}</Badge>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {announcement.priority}
            </span>
            {announcement.pinned ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Pin size={13} /> Pinned
              </span>
            ) : null}
            {!management && !announcement.readAt ? (
              <span className="size-2 rounded-full bg-primary" aria-label="Unread" />
            ) : null}
          </div>
          <CardHeader
            className="mt-3"
            icon={<Megaphone size={19} />}
            title={announcement.title}
            tone={
              announcement.priority === 'urgent'
                ? 'rose'
                : announcement.priority === 'high'
                  ? 'gold'
                  : 'blue'
            }
          />
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
            {announcement.message}
          </p>
        </div>
        {management ? <Badge>{announcement.status}</Badge> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <span>By {announcement.publisherName}</span>
        <span>
          {displayDate(
            announcement.publishedAt ?? announcement.publishAt ?? announcement.createdAt,
          )}
        </span>
        {announcement.acknowledgementRequired ? <span>Acknowledgement required</span> : null}
        {announcement.attachments.length ? (
          <span>
            {announcement.attachments.length} attachment
            {announcement.attachments.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4 dark:border-slate-700">
        <Button onClick={onOpen} variant="secondary">
          <Eye size={15} /> View
        </Button>
        {management && ['draft', 'scheduled'].includes(announcement.status) ? (
          <Button onClick={onEdit} variant="secondary">
            <Pencil size={15} /> Edit
          </Button>
        ) : null}
        {management && announcement.status === 'draft' ? (
          <Button onClick={() => onAction('publish')}>
            <Send size={15} /> Publish
          </Button>
        ) : null}
        {management && announcement.status === 'draft' ? (
          <Button onClick={() => onAction('schedule')} variant="secondary">
            <CalendarClock size={15} /> Schedule
          </Button>
        ) : null}
        {management && ['draft', 'scheduled'].includes(announcement.status) ? (
          <Button onClick={() => onAction('cancel')} variant="secondary">
            <XCircle size={15} /> Cancel
          </Button>
        ) : null}
        {management && announcement.status === 'published' ? (
          <Button onClick={() => onAction('archive')} variant="secondary">
            <Archive size={15} /> Archive
          </Button>
        ) : null}
        {management && announcement.status === 'published' ? (
          <Button onClick={() => onAction('pin')} variant="secondary">
            <Pin size={15} /> {announcement.pinned ? 'Unpin' : 'Pin'}
          </Button>
        ) : null}
        {management && announcement.status === 'published' ? (
          <Button onClick={() => onAction('delivery')} variant="secondary">
            <CheckCheck size={15} /> Delivery
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export default function AnnouncementsPage() {
  const user = useAuthStore((state) => state.user);
  const { notify } = useDashboardToast();
  const permissions = user ? ROLE_PERMISSIONS[user.role] : [];
  const canManage = permissions.includes('announcements:write');
  const client = useQueryClient();
  const [mode, setMode] = useState<'feed' | 'manage'>('feed');
  const [filters, setFilters] = useState<AnnouncementFilters>({
    search: '',
    category: 'all',
    priority: 'all',
    status: 'all',
    sort: 'newest',
    page: 1,
  });
  const [editing, setEditing] = useState<AnnouncementSummary | 'create' | null>(null);
  const [selected, setSelected] = useState<AnnouncementSummary | null>(null);
  const [action, setAction] = useState<{
    readonly type: 'schedule' | 'cancel';
    readonly item: AnnouncementSummary;
  } | null>(null);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const feed = useAnnouncements(filters);
  const managed = useManagedAnnouncements(
    { search: filters.search, status: filters.status, sort: filters.sort, page: filters.page },
    canManage && mode === 'manage',
  );
  const active = mode === 'manage' ? managed : feed;
  const courses = useQuery({
    queryKey: ['academic', 'courses'],
    enabled: canManage,
    queryFn: async () =>
      (await apiClient.get<ApiResponse<readonly CourseOption[]>>('/academic/courses')).data.data,
  });
  const delivery = useQuery({
    queryKey: ['announcements', 'delivery', deliveryId],
    enabled: Boolean(deliveryId),
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<AnnouncementDeliverySummary>>(
          `/announcements/${deliveryId}/delivery`,
        )
      ).data.data,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['announcements'] }),
      client.invalidateQueries({ queryKey: ['notifications'] }),
      client.invalidateQueries({ queryKey: ['portal', 'summary'] }),
    ]);
  };
  const save = useMutation({
    mutationFn: ({ id, body }: { readonly id?: string; readonly body: Record<string, unknown> }) =>
      id ? apiClient.patch(`/announcements/${id}`, body) : apiClient.post('/announcements', body),
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      setMode('manage');
      notify({
        tone: 'success',
        title: 'Announcement saved',
        message: 'The announcement draft was saved successfully.',
      });
    },
    onError: (error) =>
      notify({
        tone: 'error',
        title: 'Announcement not saved',
        message: apiErrorMessage(error, 'The announcement could not be saved.'),
      }),
  });
  const mutateAction = useMutation({
    mutationFn: ({
      item,
      type,
    }: {
      readonly item: AnnouncementSummary;
      readonly type: 'publish' | 'archive' | 'pin';
    }) =>
      type === 'pin'
        ? apiClient.patch(`/announcements/${item.id}/pin`, { pinned: !item.pinned })
        : apiClient.post(`/announcements/${item.id}/${type}`),
    onSuccess: async (_, variables) => {
      await refresh();
      notify({
        tone: 'success',
        title: 'Announcement updated',
        message: `The announcement was ${variables.type === 'publish' ? 'published' : variables.type === 'archive' ? 'archived' : 'updated'} successfully.`,
      });
    },
    onError: (error) =>
      notify({
        tone: 'error',
        title: 'Announcement not updated',
        message: apiErrorMessage(error, 'The announcement action could not be completed.'),
      }),
  });
  const scheduleOrCancel = useMutation({
    mutationFn: ({
      item,
      type,
      value,
    }: {
      readonly item: AnnouncementSummary;
      readonly type: 'schedule' | 'cancel';
      readonly value: string;
    }) =>
      apiClient.post(
        `/announcements/${item.id}/${type}`,
        type === 'schedule' ? { publishAt: new Date(value).toISOString() } : { reason: value },
      ),
    onSuccess: async (_, variables) => {
      await refresh();
      setAction(null);
      notify({
        tone: 'success',
        title: variables.type === 'schedule' ? 'Announcement scheduled' : 'Announcement cancelled',
        message:
          variables.type === 'schedule'
            ? 'The announcement publication was scheduled successfully.'
            : 'The announcement was cancelled successfully.',
      });
    },
    onError: (error) =>
      notify({
        tone: 'error',
        title: 'Announcement action failed',
        message: apiErrorMessage(error, 'The announcement action could not be completed.'),
      }),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.post(`/announcements/${id}/read`),
    onSuccess: refresh,
  });
  const acknowledge = useMutation({
    mutationFn: (id: string) => apiClient.post(`/announcements/${id}/acknowledge`),
    onSuccess: async () => {
      await refresh();
      setSelected((current) =>
        current ? { ...current, acknowledgedAt: new Date().toISOString() } : current,
      );
    },
  });
  const open = (item: AnnouncementSummary) => {
    setSelected(item);
    if (mode === 'feed' && !item.readAt) markRead.mutate(item.id);
  };
  const submitAction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action) return;
    const data = new FormData(event.currentTarget);
    const value = data.get(action.type === 'schedule' ? 'publishAt' : 'reason');
    if (typeof value === 'string')
      scheduleOrCancel.mutate({ item: action.item, type: action.type, value });
  };
  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Institution communication</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            Targeted academic and operational updates, with clear priorities and acknowledgement
            tracking.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setEditing('create')}>
            <Plus size={17} /> Create announcement
          </Button>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Announcement view">
        <Button
          onClick={() => {
            setMode('feed');
            setFilters((value) => ({ ...value, status: 'all', page: 1 }));
          }}
          variant={mode === 'feed' ? 'primary' : 'secondary'}
        >
          <BellRing size={16} /> My feed {feed.data?.unread ? `(${feed.data.unread})` : ''}
        </Button>
        {canManage ? (
          <Button
            onClick={() => {
              setMode('manage');
              setFilters((value) => ({ ...value, status: 'all', page: 1 }));
            }}
            variant={mode === 'manage' ? 'primary' : 'secondary'}
          >
            <Megaphone size={16} /> Manage
          </Button>
        ) : null}
      </div>
      <Card className="mt-5 p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Input
            aria-label="Search announcements"
            label="Search announcements"
            onChange={(event) =>
              setFilters((value) => ({ ...value, search: event.currentTarget.value, page: 1 }))
            }
            placeholder="Search announcements"
            type="search"
            value={filters.search}
          />
          {mode === 'feed' ? (
            <select
              aria-label="Category"
              className={selectClass}
              onChange={(event) =>
                setFilters((value) => ({ ...value, category: event.currentTarget.value, page: 1 }))
              }
              value={filters.category}
            >
              <option value="all">All categories</option>
              {['academic', 'administrative', 'emergency', 'event', 'general'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          ) : null}
          {mode === 'feed' ? (
            <select
              aria-label="Priority"
              className={selectClass}
              onChange={(event) =>
                setFilters((value) => ({ ...value, priority: event.currentTarget.value, page: 1 }))
              }
              value={filters.priority}
            >
              <option value="all">All priorities</option>
              {['low', 'normal', 'high', 'urgent'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          ) : null}
          <select
            aria-label="Status"
            className={selectClass}
            onChange={(event) =>
              setFilters((value) => ({ ...value, status: event.currentTarget.value, page: 1 }))
            }
            value={filters.status}
          >
            {(mode === 'feed'
              ? ['all', 'unread', 'read', 'acknowledged']
              : ['all', 'draft', 'scheduled', 'published', 'archived', 'cancelled']
            ).map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'All statuses' : item}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort announcements"
            className={selectClass}
            onChange={(event) =>
              setFilters((value) => ({
                ...value,
                sort: event.currentTarget.value as AnnouncementFilters['sort'],
                page: 1,
              }))
            }
            value={filters.sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Priority first</option>
            <option value="expires_soon">Expiring soon</option>
          </select>
        </div>
      </Card>
      <section className="mt-6" aria-live="polite">
        {active.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : active.isError ? (
          <ErrorState
            title="Announcements unavailable"
            description="The announcement feed could not be loaded."
            retry={() => void active.refetch()}
          />
        ) : active.data?.items.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {active.data.items.map((item) => (
              <AnnouncementCard
                announcement={item}
                key={item.id}
                management={mode === 'manage'}
                onAction={(type) => {
                  if (type === 'schedule' || type === 'cancel') setAction({ type, item });
                  else if (type === 'delivery') setDeliveryId(item.id);
                  else mutateAction.mutate({ item, type });
                }}
                onEdit={() => setEditing(item)}
                onOpen={() => open(item)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={mode === 'manage' ? 'No managed announcements' : 'Your feed is clear'}
            description={
              mode === 'manage'
                ? 'Create a secure draft to begin communicating with an authorized audience.'
                : 'New announcements for your courses and institution will appear here.'
            }
          />
        )}
        {active.data && active.data.pagination.pages > 1 ? (
          <div className="mt-6 flex items-center justify-between">
            <Button
              disabled={filters.page <= 1}
              onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))}
              variant="secondary"
            >
              Previous
            </Button>
            <span className="text-sm text-slate-500">
              Page {filters.page} of {active.data.pagination.pages}
            </span>
            <Button
              disabled={filters.page >= active.data.pagination.pages}
              onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        ) : null}
      </section>
      <Dialog
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'create' ? 'Create announcement draft' : 'Edit announcement'}
      >
        {editing ? (
          <AnnouncementEditor
            {...(editing === 'create' ? {} : { announcement: editing })}
            courses={courses.data ?? []}
            {...(save.isError
              ? { error: apiErrorMessage(save.error, 'The announcement could not be saved.') }
              : {})}
            isLecturer={user?.role === 'lecturer'}
            onSubmit={(body) =>
              save.mutate({ ...(editing !== 'create' ? { id: editing.id } : {}), body })
            }
            pending={save.isPending}
          />
        ) : null}
      </Dialog>
      <Dialog
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Announcement'}
      >
        {selected ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{selected.category}</Badge>
              <Badge>{selected.priority}</Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
              {selected.message}
            </p>
            <p className="text-xs text-slate-500">
              Published by {selected.publisherName} ·{' '}
              {displayDate(selected.publishedAt ?? selected.createdAt)}
            </p>
            {selected.attachments.length ? (
              <div className="grid gap-2">
                <h3 className="text-sm font-bold">Attachments</h3>
                {selected.attachments.map((attachment) => (
                  <a
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium text-primary hover:bg-primary/5 dark:border-slate-700"
                    href={attachment.url}
                    key={attachment.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <FileText size={16} /> {attachment.name}
                  </a>
                ))}
              </div>
            ) : null}
            {selected.acknowledgementRequired && !selected.acknowledgedAt && mode === 'feed' ? (
              <Button
                disabled={acknowledge.isPending}
                onClick={() => acknowledge.mutate(selected.id)}
              >
                <CheckCheck size={16} /> Acknowledge
              </Button>
            ) : null}
            {selected.acknowledgedAt ? (
              <p className="text-sm font-semibold text-primary">
                Acknowledged {displayDate(selected.acknowledgedAt)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Dialog>
      <Dialog
        footer={
          <Button
            disabled={scheduleOrCancel.isPending}
            form="announcement-action-form"
            type="submit"
          >
            {scheduleOrCancel.isPending
              ? 'Saving…'
              : action?.type === 'schedule'
                ? 'Schedule announcement'
                : 'Cancel announcement'}
          </Button>
        }
        isOpen={action !== null}
        onClose={() => setAction(null)}
        title={action?.type === 'schedule' ? 'Schedule publication' : 'Cancel announcement'}
      >
        <form className="grid gap-4" id="announcement-action-form" onSubmit={submitAction}>
          {action?.type === 'schedule' ? (
            <Input
              label="Publish at"
              min={new Date().toISOString().slice(0, 16)}
              name="publishAt"
              required
              type="datetime-local"
            />
          ) : (
            <Input
              label="Cancellation reason"
              maxLength={300}
              minLength={3}
              name="reason"
              required
            />
          )}
          <MutationFormFeedback
            error={scheduleOrCancel.error}
            errorFallback="The announcement action could not be completed."
            status={
              scheduleOrCancel.isSuccess ? 'success' : scheduleOrCancel.isError ? 'error' : 'idle'
            }
            submissionId={scheduleOrCancel.submittedAt}
            successMessage="The announcement action was completed successfully."
            successTitle="Announcement updated"
          />
        </form>
      </Dialog>
      <Dialog
        isOpen={deliveryId !== null}
        onClose={() => setDeliveryId(null)}
        title="Announcement delivery"
      >
        {delivery.isLoading ? (
          <Skeleton className="h-32" />
        ) : delivery.isError ? (
          <ErrorState
            title="Delivery unavailable"
            description="Delivery statistics could not be loaded."
            retry={() => void delivery.refetch()}
          />
        ) : delivery.data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(
              [
                ['targeted', delivery.data.targeted],
                ['delivered', delivery.data.delivered],
                ['read', delivery.data.read],
                ['acknowledged', delivery.data.acknowledged],
                ['failed', delivery.data.failed],
              ] as const
            ).map(([label, value], index) => {
              const tones = ['blue', 'green', 'violet', 'gold', 'rose'] as const;
              const icons = [Users, Send, Eye, CheckCheck, BellRing] as const;
              const DeliveryIcon = icons[index % icons.length] ?? BellRing;
              return (
                <MetricCard
                  className="p-4"
                  icon={<DeliveryIcon aria-hidden="true" size={18} />}
                  key={label}
                  label={label.replaceAll('_', ' ')}
                  tone={tones[index % tones.length] ?? 'blue'}
                  value={value}
                />
              );
            })}
          </div>
        ) : null}
      </Dialog>
    </DashboardLayout>
  );
}
