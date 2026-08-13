import type { ApiResponse, ClassSchedulePage, ClassScheduleSummary } from '@qr/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardHeader, Dialog, EmptyState, ErrorState, Input, Skeleton } from '@qr/ui';
import { CalendarClock, Clock3, MapPin, Pencil, Plus, XCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';

interface CourseOption {
  readonly _id: string;
  readonly code: string;
  readonly title: string;
  readonly lecturerId?: { readonly _id: string } | null;
}
const selectClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-dark-surface';
function localInput(iso: string): string {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function formText(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
}

export default function ClassSchedulesPage() {
  const user = useAuthStore((state) => state.user);
  const { notify } = useDashboardToast();
  const client = useQueryClient();
  const [status, setStatus] = useState<'scheduled' | 'cancelled' | 'completed' | 'all'>(
    'scheduled',
  );
  const [editing, setEditing] = useState<ClassScheduleSummary | 'create' | null>(null);
  const [cancelling, setCancelling] = useState<ClassScheduleSummary | null>(null);
  const canManage =
    user?.role === 'lecturer' || user?.role === 'university_admin' || user?.role === 'super_admin';
  const schedules = useQuery({
    queryKey: ['class-schedules', status],
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<ClassSchedulePage>>(
          `/academic/schedules?status=${status}&limit=100`,
        )
      ).data.data,
  });
  const courses = useQuery({
    queryKey: ['academic', 'courses'],
    enabled: canManage,
    queryFn: async () =>
      (await apiClient.get<ApiResponse<readonly CourseOption[]>>('/academic/courses')).data.data,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['class-schedules'] }),
      client.invalidateQueries({ queryKey: ['reminders'] }),
    ]);
  };
  const save = useMutation({
    mutationFn: ({ id, body }: { readonly id?: string; readonly body: Record<string, unknown> }) =>
      id
        ? apiClient.patch(`/academic/schedules/${id}`, body)
        : apiClient.post('/academic/schedules', body),
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      notify({
        tone: 'success',
        title: 'Class schedule saved',
        message: 'The class schedule was saved successfully.',
      });
    },
  });
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { readonly id: string; readonly reason: string }) =>
      apiClient.post(`/academic/schedules/${id}/cancel`, { reason }),
    onSuccess: async () => {
      await refresh();
      setCancelling(null);
      notify({
        tone: 'success',
        title: 'Class schedule cancelled',
        message: 'The class schedule was cancelled successfully.',
      });
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const startsAt = formText(data, 'startsAt');
    const endsAt = formText(data, 'endsAt');
    const body = {
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      venue: formText(data, 'venue'),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      ...(editing === 'create' ? { courseId: formText(data, 'courseId') } : {}),
    };
    save.mutate({ ...(editing !== 'create' && editing ? { id: editing.id } : {}), body });
  };
  const submitCancellation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cancelling) return;
    cancel.mutate({
      id: cancelling.id,
      reason: formText(new FormData(event.currentTarget), 'reason'),
    });
  };
  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Academic timetable</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Class schedules</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
            One live schedule for venues, times, educators, and automatic class reminders.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setEditing('create')}>
            <Plus size={17} /> Schedule a class
          </Button>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Schedule status">
        {(['scheduled', 'cancelled', 'completed', 'all'] as const).map((item) => (
          <Button
            key={item}
            onClick={() => setStatus(item)}
            variant={status === item ? 'primary' : 'secondary'}
          >
            {item === 'all' ? 'All classes' : `${item[0]?.toUpperCase()}${item.slice(1)}`}
          </Button>
        ))}
      </div>
      <section className="mt-6">
        {schedules.isLoading ? (
          <div className="grid gap-3" aria-busy="true">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : schedules.isError ? (
          <ErrorState
            title="Timetable unavailable"
            description="Class schedules could not be loaded."
            retry={() => void schedules.refetch()}
          />
        ) : schedules.data?.items.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {schedules.data.items.map((schedule) => (
              <Card
                className="overflow-hidden p-0"
                key={schedule.id}
                tone={schedule.status === 'cancelled' ? 'rose' : 'blue'}
              >
                <div className="border-l-4 border-primary p-5">
                  <div className="flex items-start justify-between gap-3">
                    <CardHeader
                      description={schedule.courseCode}
                      icon={<CalendarClock aria-hidden="true" size={20} />}
                      title={schedule.courseTitle}
                      tone={schedule.status === 'cancelled' ? 'rose' : 'blue'}
                    />
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-primary dark:bg-emerald-950">
                      {schedule.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <p className="flex items-center gap-2">
                      <Clock3 size={16} className="text-primary" />
                      {new Date(schedule.startsAt).toLocaleString()} –{' '}
                      {new Date(schedule.endsAt).toLocaleTimeString()}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin size={16} className="text-primary" />
                      {schedule.venue}
                    </p>
                    <p>Educator: {schedule.lecturerName}</p>
                    {schedule.cancellationReason ? (
                      <p className="text-danger">Reason: {schedule.cancellationReason}</p>
                    ) : null}
                  </div>
                  {canManage && schedule.status === 'scheduled' ? (
                    <div className="mt-5 flex gap-2 border-t border-border pt-4 dark:border-slate-700">
                      <Button onClick={() => setEditing(schedule)} variant="secondary">
                        <Pencil size={15} /> Edit
                      </Button>
                      <Button onClick={() => setCancelling(schedule)} variant="danger">
                        <XCircle size={15} /> Cancel
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No matching classes"
            description="There are no class schedules in this view yet."
          />
        )}
      </section>
      <Dialog
        footer={
          <Button disabled={save.isPending} form="schedule-form" type="submit">
            {save.isPending ? 'Saving…' : 'Save schedule'}
          </Button>
        }
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'create' ? 'Schedule a class' : 'Update class schedule'}
      >
        <form className="grid gap-4" id="schedule-form" onSubmit={submit}>
          {editing === 'create' ? (
            <label className="grid gap-2 text-sm font-medium">
              Course
              <select className={selectClass} name="courseId" required>
                <option value="">Select a course</option>
                {courses.data?.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.code} — {course.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Input
            defaultValue={editing !== 'create' && editing ? localInput(editing.startsAt) : ''}
            label="Starts at"
            name="startsAt"
            required
            type="datetime-local"
          />
          <Input
            defaultValue={editing !== 'create' && editing ? localInput(editing.endsAt) : ''}
            label="Ends at"
            name="endsAt"
            required
            type="datetime-local"
          />
          <Input
            defaultValue={editing !== 'create' && editing ? editing.venue : ''}
            label="Venue or meeting location"
            name="venue"
            required
          />
          <p className="text-xs text-slate-500">
            Times are saved in {Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'} and
            converted for each user.
          </p>
          <MutationFormFeedback
            error={save.error}
            errorFallback="The schedule could not be saved."
            status={save.isSuccess ? 'success' : save.isError ? 'error' : 'idle'}
            submissionId={save.submittedAt}
            successMessage="The class schedule was saved successfully."
            successTitle="Schedule saved"
          />
        </form>
      </Dialog>
      <Dialog
        footer={
          <Button
            disabled={cancel.isPending}
            form="cancel-schedule-form"
            type="submit"
            variant="danger"
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel class'}
          </Button>
        }
        isOpen={cancelling !== null}
        onClose={() => setCancelling(null)}
        title="Cancel class"
      >
        <form className="grid gap-4" id="cancel-schedule-form" onSubmit={submitCancellation}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            All pending reminders will be cancelled and enrolled users will be notified immediately.
          </p>
          <Input label="Cancellation reason" minLength={3} name="reason" required />
          <MutationFormFeedback
            error={cancel.error}
            errorFallback="The class could not be cancelled."
            status={cancel.isSuccess ? 'success' : cancel.isError ? 'error' : 'idle'}
            submissionId={cancel.submittedAt}
            successMessage="The class was cancelled and pending reminders were updated."
            successTitle="Class cancelled"
          />
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
