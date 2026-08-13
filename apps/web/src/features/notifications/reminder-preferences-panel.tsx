import type { NotificationChannel, ReminderPreference } from '@qr/types';
import { Button, Card, CardHeader, ErrorState, Skeleton } from '@qr/ui';
import { BellRing, Clock3, History, Smartphone } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { apiErrorMessage } from '../auth/auth-utils.js';
import {
  useReminderActions,
  useReminderHistory,
  useReminderPreference,
  useUpcomingSchedules,
} from './use-reminders.js';

const OFFSETS = [5, 10, 15, 30, 60, 120, 1440] as const;
const channelLabels: Record<NotificationChannel, string> = {
  in_app: 'In-app',
  email: 'Email',
  push: 'Push',
  sms: 'SMS',
};
const inputClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-dark-surface';

function minuteToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
function timeToMinute(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}
function vapidKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob((value + padding).replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function PreferenceForm({ preference }: { readonly preference: ReminderPreference }) {
  const actions = useReminderActions();
  const schedules = useUpcomingSchedules();
  const [enabled, setEnabled] = useState(preference.enabled);
  const [offset, setOffset] = useState(preference.defaultOffsetMinutes);
  const [channels, setChannels] = useState<readonly NotificationChannel[]>(preference.channels);
  const [muted, setMuted] = useState<readonly string[]>(preference.mutedCourseIds);
  const [quietEnabled, setQuietEnabled] = useState(preference.quietHours.enabled);
  const [quietStart, setQuietStart] = useState(minuteToTime(preference.quietHours.startMinute));
  const [quietEnd, setQuietEnd] = useState(minuteToTime(preference.quietHours.endMinute));
  const [customOffsets, setCustomOffsets] = useState<Record<string, number>>(
    Object.fromEntries(
      preference.overrides
        .filter((item) => item.enabled && item.offsetMinutes)
        .map((item) => [item.scheduleId, item.offsetMinutes ?? offset]),
    ),
  );
  const [message, setMessage] = useState('');
  const available = useMemo(
    () => new Map(preference.channelAvailability.map((item) => [item.channel, item])),
    [preference.channelAvailability],
  );
  const busy = actions.save.isPending || actions.reset.isPending;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    actions.save.mutate(
      {
        enabled,
        defaultOffsetMinutes: offset,
        channels,
        ...(Intl.DateTimeFormat().resolvedOptions().timeZone
          ? { preferredTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
          : {}),
        quietHours: {
          enabled: quietEnabled,
          startMinute: timeToMinute(quietStart),
          endMinute: timeToMinute(quietEnd),
        },
        mutedCourseIds: muted,
        overrides: Object.entries(customOffsets).map(([scheduleId, offsetMinutes]) => ({
          scheduleId,
          enabled: true,
          offsetMinutes,
        })),
      },
      { onSuccess: () => setMessage('Reminder preferences saved.') },
    );
  };
  const toggleChannel = (channel: NotificationChannel) =>
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  const enablePush = async () => {
    setMessage('');
    try {
      if (
        !preference.pushPublicKey ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      )
        throw new Error('Push reminders are unavailable in this browser.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey(preference.pushPublicKey),
        }));
      await actions.subscribePush.mutateAsync(subscription.toJSON());
      setMessage('Push reminders enabled on this device.');
    } catch (error) {
      setMessage(apiErrorMessage(error, 'Push reminders could not be enabled.'));
    }
  };
  const disablePush = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await actions.revokePush.mutateAsync(subscription.endpoint);
    await subscription.unsubscribe();
    setMessage('Push reminders disabled on this device.');
  };
  const restoreDefaults = () => {
    setMessage('');
    actions.reset.mutate(undefined, {
      onSuccess: () => {
        setEnabled(true);
        setOffset(30);
        setChannels(['in_app']);
        setMuted([]);
        setQuietEnabled(false);
        setQuietStart('22:00');
        setQuietEnd('07:00');
        setCustomOffsets({});
        setMessage('Defaults restored.');
      },
    });
  };

  return (
    <form className="grid gap-6" onSubmit={submit}>
      <div className="flex flex-col gap-4 rounded-2xl bg-emerald-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold">Upcoming class reminders</p>
          <p className="mt-1 text-sm text-emerald-100">
            Timely, private alerts in your local time zone.
          </p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-white/10 px-4 text-sm font-semibold">
          <input
            checked={enabled}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
            type="checkbox"
          />
          {enabled ? 'Enabled' : 'Disabled'}
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Default reminder time
          <select
            className={inputClass}
            onChange={(event) => setOffset(Number(event.currentTarget.value))}
            value={offset}
          >
            {OFFSETS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 1440 ? '1 day before' : `${minutes} minutes before`}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="text-sm font-medium">Delivery channels</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {preference.channelAvailability.map((item) => (
              <label
                className="flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-100/60 px-3 text-sm dark:border-blue-800 dark:bg-blue-950/50"
                key={item.channel}
                title={item.reason}
              >
                <input
                  checked={channels.includes(item.channel)}
                  disabled={!item.available}
                  onChange={() => toggleChannel(item.channel)}
                  type="checkbox"
                />
                {channelLabels[item.channel]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-violet-200 bg-violet-100/55 p-5 dark:border-violet-800 dark:bg-violet-950/45 md:grid-cols-[auto_1fr_1fr] md:items-end">
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            checked={quietEnabled}
            onChange={(event) => setQuietEnabled(event.currentTarget.checked)}
            type="checkbox"
          />{' '}
          Quiet hours
        </label>
        <label className="grid gap-2 text-sm font-medium">
          From
          <input
            className={inputClass}
            disabled={!quietEnabled}
            onChange={(event) => setQuietStart(event.currentTarget.value)}
            type="time"
            value={quietStart}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Until
          <input
            className={inputClass}
            disabled={!quietEnabled}
            onChange={(event) => setQuietEnd(event.currentTarget.value)}
            type="time"
            value={quietEnd}
          />
        </label>
      </div>

      {preference.courses.length ? (
        <fieldset>
          <legend className="text-sm font-bold">Muted courses</legend>
          <p className="mt-1 text-sm text-slate-500">Pause class reminders for selected courses.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {preference.courses.map((course) => (
              <label
                className="flex min-h-11 items-center gap-3 rounded-xl border border-amber-200 bg-amber-100/60 px-3 text-sm dark:border-amber-800 dark:bg-amber-950/50"
                key={course.id}
              >
                <input
                  checked={muted.includes(course.id)}
                  onChange={() =>
                    setMuted((current) =>
                      current.includes(course.id)
                        ? current.filter((id) => id !== course.id)
                        : [...current, course.id],
                    )
                  }
                  type="checkbox"
                />
                <span>
                  <strong>{course.code}</strong> · {course.title}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {schedules.data?.items.length ? (
        <fieldset>
          <legend className="text-sm font-bold">Specific class overrides</legend>
          <p className="mt-1 text-sm text-slate-500">
            Use a different reminder time for an individual upcoming class.
          </p>
          <div className="mt-3 grid gap-2">
            {schedules.data.items.slice(0, 8).map((schedule) => (
              <div
                className="grid gap-3 rounded-xl border border-teal-200 bg-teal-100/60 p-3 dark:border-teal-800 dark:bg-teal-950/50 sm:grid-cols-[1fr_auto] sm:items-center"
                key={schedule.id}
              >
                <div>
                  <p className="text-sm font-semibold">
                    {schedule.courseCode} · {schedule.courseTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(schedule.startsAt).toLocaleString()} · {schedule.venue}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={schedule.id in customOffsets}
                    onChange={(event) =>
                      setCustomOffsets((current) => {
                        const next = { ...current };
                        if (event.currentTarget.checked) next[schedule.id] = offset;
                        else delete next[schedule.id];
                        return next;
                      })
                    }
                    type="checkbox"
                  />
                  Custom
                  <select
                    aria-label={`Reminder time for ${schedule.courseCode}`}
                    className="h-9 rounded-lg border border-border bg-surface px-2 dark:border-slate-700 dark:bg-dark-surface"
                    disabled={!(schedule.id in customOffsets)}
                    onChange={(event) =>
                      setCustomOffsets((current) => ({
                        ...current,
                        [schedule.id]: Number(event.currentTarget.value),
                      }))
                    }
                    value={customOffsets[schedule.id] ?? offset}
                  >
                    {OFFSETS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes === 1440 ? '1 day' : `${minutes} min`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-100/70 to-emerald-100/60 p-5 dark:border-blue-800 dark:from-blue-950/50 dark:to-emerald-950/40">
        <div className="flex items-start gap-3">
          <Smartphone className="text-primary" />
          <div>
            <p className="font-bold">Browser push</p>
            <p className="mt-1 text-sm text-slate-500">
              Receive reminders even when Attendity is not open.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {preference.pushSubscribed ? (
            <Button onClick={() => void disablePush()} type="button" variant="secondary">
              Disable on this device
            </Button>
          ) : (
            <Button
              disabled={!available.get('push')?.configured || actions.subscribePush.isPending}
              onClick={() => void enablePush()}
              type="button"
            >
              Enable on this device
            </Button>
          )}
          {preference.channelAvailability
            .filter((item) => item.available)
            .map((item) => (
              <Button
                disabled={actions.test.isPending}
                key={item.channel}
                onClick={() =>
                  actions.test.mutate(item.channel, {
                    onSuccess: () => setMessage(`${channelLabels[item.channel]} test sent.`),
                  })
                }
                type="button"
                variant="secondary"
              >
                Test {channelLabels[item.channel]}
              </Button>
            ))}
        </div>
      </div>

      {message || actions.save.isError || actions.reset.isError ? (
        <p className="text-sm" role="status">
          {message ||
            apiErrorMessage(
              actions.save.error ?? actions.reset.error,
              'Reminder preferences could not be saved.',
            )}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy || (enabled && channels.length === 0)} type="submit">
          {actions.save.isPending ? 'Saving…' : 'Save reminder settings'}
        </Button>
        <Button disabled={busy} onClick={restoreDefaults} type="button" variant="secondary">
          Restore defaults
        </Button>
      </div>
    </form>
  );
}

export function ReminderPreferencesPanel() {
  const preference = useReminderPreference();
  const history = useReminderHistory();
  if (preference.isLoading)
    return (
      <Card className="mt-6 p-6" aria-busy="true">
        <Skeleton className="h-80" />
      </Card>
    );
  if (preference.isError || !preference.data)
    return (
      <div className="mt-6">
        <ErrorState
          title="Reminder settings unavailable"
          description="Your class reminder preferences could not be loaded."
          retry={() => void preference.refetch()}
        />
      </div>
    );
  return (
    <section className="mt-6" aria-labelledby="reminder-heading">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-primary dark:bg-emerald-950">
          <BellRing size={20} />
        </span>
        <div>
          <h2 className="text-xl font-bold" id="reminder-heading">
            Class reminders
          </h2>
          <p className="text-sm text-slate-500">Control when and where Attendity alerts you.</p>
        </div>
      </div>
      <Card className="p-5 sm:p-7" tone="blue">
        <PreferenceForm preference={preference.data} />
      </Card>
      <Card className="mt-6 p-5 sm:p-7" tone="teal">
        <CardHeader
          description="Only you can see the status of your reminders."
          icon={<History size={19} />}
          level={3}
          title="Private delivery history"
          tone="teal"
        />
        {history.data?.items.length ? (
          <ul className="mt-4 divide-y divide-border dark:divide-slate-700">
            {history.data.items.map((item) => (
              <li
                className="my-2 flex flex-col gap-1 rounded-xl border-l-4 border-l-teal-600 bg-gradient-to-r from-teal-100/90 to-blue-100/70 px-4 py-3 text-sm dark:from-teal-950/60 dark:to-blue-950/50 sm:flex-row sm:items-center sm:justify-between"
                key={item.id}
              >
                <span>
                  <strong>{item.courseCode}</strong> · {channelLabels[item.channel]}
                  <span className="ml-2 text-slate-500">{item.courseTitle}</span>
                </span>
                <span className="inline-flex items-center gap-2 capitalize text-slate-500">
                  <Clock3 size={14} />
                  {new Date(item.scheduledFor).toLocaleString()} · {item.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No class reminder deliveries have been scheduled yet.
          </p>
        )}
      </Card>
    </section>
  );
}
