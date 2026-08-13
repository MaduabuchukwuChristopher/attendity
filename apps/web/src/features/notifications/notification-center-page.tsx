import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '@qr/ui';
import type { AppNotification } from '@qr/types';
import { Archive, Bell, CheckCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '../../api/client.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { useNotifications, type NotificationStatus } from './use-notifications.js';

const statuses: readonly { readonly value: NotificationStatus; readonly label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' },
];

function NotificationIcon({ notification }: { readonly notification: AppNotification }) {
  const Icon =
    notification.priority === 'urgent' || notification.category.includes('risk')
      ? ShieldAlert
      : Bell;
  return (
    <span
      className={`grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-lg ${
        notification.priority === 'urgent' || notification.category.includes('risk')
          ? 'bg-rose-700 dark:bg-rose-400 dark:text-rose-950'
          : notification.readAt
            ? 'bg-teal-700 dark:bg-teal-400 dark:text-teal-950'
            : 'bg-blue-700 dark:bg-blue-400 dark:text-blue-950'
      }`}
    >
      <Icon aria-hidden="true" size={20} />
    </span>
  );
}

export default function NotificationCenterPage() {
  const user = useAuthStore((state) => state.user);
  const client = useQueryClient();
  const [status, setStatus] = useState<NotificationStatus>('all');
  const [page, setPage] = useState(1);
  const notifications = useNotifications(status, page, 20, Boolean(user));
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['notifications'] });
    await client.invalidateQueries({ queryKey: ['portal', 'summary'] });
  };
  const read = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: refresh,
  });
  const archive = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/archive`),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/notifications/${id}`),
    onSuccess: refresh,
  });
  const readAll = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: refresh,
  });
  if (!user)
    return (
      <DashboardLayout>
        <ErrorState title="Your session has ended" description="Sign in to view notifications." />
      </DashboardLayout>
    );
  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Communication centre</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Attendance events, risk warnings, and operational updates.
          </p>
        </div>
        <Button
          disabled={!notifications.data?.unread || readAll.isPending}
          onClick={() => readAll.mutate()}
          variant="secondary"
        >
          <CheckCheck aria-hidden="true" size={18} />
          Mark all read
        </Button>
      </div>

      <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Notification status">
        {statuses.map((item) => (
          <Button
            aria-pressed={status === item.value}
            key={item.value}
            onClick={() => {
              setStatus(item.value);
              setPage(1);
            }}
            variant={status === item.value ? 'primary' : 'secondary'}
          >
            {item.label}
            {item.value === 'unread' && notifications.data?.unread ? (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {notifications.data.unread}
              </span>
            ) : null}
          </Button>
        ))}
      </div>

      {notifications.isLoading ? (
        <div className="mt-6 grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : notifications.isError ? (
        <div className="mt-6">
          <ErrorState
            title="Unable to load notifications"
            description="Please retry the request."
            retry={() => void notifications.refetch()}
          />
        </div>
      ) : notifications.data?.items.length ? (
        <section className="mt-6 grid gap-3" aria-label="Notification list">
          {notifications.data.items.map((notification) => (
            <Card
              className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-start ${notification.readAt ? '' : 'border-primary/30'}`}
              key={notification.id}
              tone={
                notification.priority === 'urgent' || notification.category.includes('risk')
                  ? 'rose'
                  : notification.readAt
                    ? 'teal'
                    : 'blue'
              }
            >
              <NotificationIcon notification={notification} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{notification.title}</h2>
                  {!notification.readAt ? <Badge tone="info">New</Badge> : null}
                  {notification.priority === 'urgent' ? <Badge tone="danger">Urgent</Badge> : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {notification.body}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!notification.readAt ? (
                  <button
                    aria-label={`Mark ${notification.title} as read`}
                    className="grid size-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => read.mutate(notification.id)}
                    type="button"
                  >
                    <CheckCheck size={18} />
                  </button>
                ) : null}
                {!notification.archivedAt ? (
                  <button
                    aria-label={`Archive ${notification.title}`}
                    className="grid size-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => archive.mutate(notification.id)}
                    type="button"
                  >
                    <Archive size={18} />
                  </button>
                ) : null}
                <button
                  aria-label={`Delete ${notification.title}`}
                  className="grid size-10 place-items-center rounded-xl text-danger hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => remove.mutate(notification.id)}
                  type="button"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="No notifications in this view"
            description="New attendance and risk updates will arrive automatically."
          />
        </div>
      )}

      {notifications.data && notifications.data.pagination.pages > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-4">
          <Button
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
            variant="secondary"
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {notifications.data.pagination.pages}
          </span>
          <Button
            disabled={page >= notifications.data.pagination.pages}
            onClick={() => setPage((value) => value + 1)}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
