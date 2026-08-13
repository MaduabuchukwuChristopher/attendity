import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  SemanticValue,
  Skeleton,
  buttonClassName,
} from '@qr/ui';
import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEvents, useManagedEvents, type EventFilters } from './use-events.js';

const filters: EventFilters = {
  search: '',
  status: 'all',
  eventType: 'all',
  mandatory: 'all',
  page: 1,
};

export function EventDashboardPanel({ management = false }: { readonly management?: boolean }) {
  const feed = useEvents(filters);
  const managed = useManagedEvents(filters, management);
  const query = management ? managed : feed;
  const upcoming = (query.data?.items ?? [])
    .filter((event) => ['scheduled', 'active'].includes(event.status))
    .slice(0, 3);
  const mandatory = upcoming.filter((event) => event.mandatory).length;
  return (
    <Card className="mt-8 p-5" tone="teal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardHeader
          description={
            <>
              <SemanticValue tone={mandatory ? 'gold' : 'green'} value={mandatory} /> mandatory
              event{mandatory === 1 ? '' : 's'} in this preview.
            </>
          }
          icon={<CalendarDays size={19} />}
          title="Upcoming participation"
          tone="teal"
        />
        <Link className={buttonClassName('secondary')} to="/app/events">
          Open events
        </Link>
      </div>
      {query.isLoading ? (
        <Skeleton className="mt-5 h-28" />
      ) : upcoming.length ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {upcoming.map((event) => (
            <Link
              className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-100/80 to-blue-100/70 p-4 transition hover:border-teal-500 dark:border-teal-800 dark:from-teal-950/60 dark:to-blue-950/50"
              key={event.id}
              to="/app/events"
            >
              <div className="flex items-center justify-between gap-2">
                <CalendarDays className="text-primary" size={18} />
                {event.mandatory ? <Badge tone="danger">Mandatory</Badge> : <Badge>Optional</Badge>}
              </div>
              <h3 className="mt-3 font-semibold">{event.title}</h3>
              <p className="mt-2 text-xs text-slate-500">
                {new Date(event.startsAt).toLocaleString()} · {event.venue}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title="No upcoming events"
            description="Scheduled institution events will appear here."
          />
        </div>
      )}
    </Card>
  );
}
