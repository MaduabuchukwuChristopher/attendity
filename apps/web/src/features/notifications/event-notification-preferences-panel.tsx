import type { ApiResponse, EventNotificationPreference, NotificationChannel } from '@qr/types';
import { Badge, Button, Card, CardHeader, ErrorState, Skeleton } from '@qr/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, LockKeyhole } from 'lucide-react';
import type { FormEvent } from 'react';
import { apiClient } from '../../api/client.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';

const channels: readonly NotificationChannel[] = ['in_app', 'email', 'push', 'sms'];

export function EventNotificationPreferencesPanel() {
  const client = useQueryClient();
  const preference = useQuery({
    queryKey: ['event-notifications', 'preference'],
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<EventNotificationPreference>>(
          '/notifications/events/preferences',
        )
      ).data.data,
  });
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.put('/notifications/events/preferences', body),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['event-notifications'] }),
        client.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    },
  });

  if (preference.isLoading) return <Skeleton className="mt-6 h-64" />;
  if (preference.isError || !preference.data)
    return (
      <div className="mt-6">
        <ErrorState
          title="Event notification settings unavailable"
          description="Retry your private event notification preferences."
          retry={() => void preference.refetch()}
        />
      </div>
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    save.mutate({
      enabled: data.get('enabled') === 'on',
      channels: channels.filter((channel) => data.get(`channel.${channel}`) === 'on'),
      informationalEnabled: data.get('informationalEnabled') === 'on',
      operationalEnabled: data.get('operationalEnabled') === 'on',
      postEventEnabled: data.get('postEventEnabled') === 'on',
      reportAvailabilityEnabled: data.get('reportAvailabilityEnabled') === 'on',
    });
  };

  return (
    <Card className="mt-6 max-w-4xl p-6" tone="violet">
      <CardHeader
        description="Choose channels for optional event information and operational updates."
        icon={<BellRing size={20} />}
        title="Event notifications"
        tone="violet"
      />
      <form className="mt-6 grid gap-6" onSubmit={submit}>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input defaultChecked={preference.data.enabled} name="enabled" type="checkbox" /> Enable
          optional event notifications
        </label>
        <fieldset>
          <legend className="text-sm font-bold">Delivery channels</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {preference.data.channelAvailability.map((availability) => (
              <label
                className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-100/60 px-3 text-sm dark:border-violet-800 dark:bg-violet-950/50 ${availability.available ? '' : 'text-slate-400'}`}
                key={availability.channel}
              >
                <span className="flex items-center gap-3">
                  <input
                    defaultChecked={preference.data.channels.includes(availability.channel)}
                    disabled={!availability.available || availability.channel === 'in_app'}
                    name={`channel.${availability.channel}`}
                    type="checkbox"
                  />
                  <span className="capitalize">{availability.channel.replace('_', ' ')}</span>
                </span>
                <Badge tone={availability.available ? 'success' : 'neutral'}>
                  {availability.available ? 'Available' : 'Unavailable'}
                </Badge>
                {availability.channel === 'in_app' ? (
                  <input name="channel.in_app" type="hidden" value="on" />
                ) : null}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-bold">Message categories</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              [
                'informationalEnabled',
                'Optional information',
                preference.data.informationalEnabled,
              ],
              ['operationalEnabled', 'Operational updates', preference.data.operationalEnabled],
              ['postEventEnabled', 'Post-event messages', preference.data.postEventEnabled],
              [
                'reportAvailabilityEnabled',
                'Report availability',
                preference.data.reportAvailabilityEnabled,
              ],
            ].map(([name, label, enabled]) => (
              <label
                className="flex min-h-12 items-center gap-3 rounded-xl border border-blue-200 bg-blue-100/60 px-3 text-sm dark:border-blue-800 dark:bg-blue-950/50"
                key={String(name)}
              >
                <input defaultChecked={Boolean(enabled)} name={String(name)} type="checkbox" />
                {String(label)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <LockKeyhole aria-hidden="true" className="shrink-0 text-primary" size={19} />
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            <strong>
              Security alerts and mandatory institutional notices remain enabled in-app.
            </strong>{' '}
            These include failed attendance verification, event cancellation, and mandatory-event
            compliance warnings.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <MutationFormFeedback
            error={save.error}
            errorFallback="The event notification settings could not be saved."
            status={save.isSuccess ? 'success' : save.isError ? 'error' : 'idle'}
            submissionId={save.submittedAt}
            successMessage="Event notification settings saved."
            successTitle="Notification settings saved"
          />
          <Button className="w-fit" disabled={save.isPending} type="submit">
            {save.isPending ? 'Saving…' : 'Save event notification settings'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
