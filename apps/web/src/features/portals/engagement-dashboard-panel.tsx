import type { ApiResponse, ClassSchedulePage } from '@qr/types';
import { Badge, Card, CardHeader, EmptyState, Skeleton, buttonClassName } from '@qr/ui';
import { useQuery } from '@tanstack/react-query';
import { BellRing, BookOpen, Clock3, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import {
  useAnnouncements,
  useManagedAnnouncements,
  type AnnouncementFilters,
} from '../announcements/use-announcements.js';

const announcementFilters: AnnouncementFilters = {
  search: '',
  category: 'all',
  priority: 'all',
  status: 'all',
  sort: 'priority',
  page: 1,
};

export function EngagementDashboardPanel({
  management = false,
}: {
  readonly management?: boolean;
}) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60_000);
  const schedules = useQuery({
    queryKey: ['class-schedules', 'dashboard'],
    queryFn: async () =>
      (
        await apiClient.get<ApiResponse<ClassSchedulePage>>('/academic/schedules', {
          params: {
            status: 'scheduled',
            from: now.toISOString(),
            to: horizon.toISOString(),
            page: 1,
            limit: 10,
          },
        })
      ).data.data,
  });
  const feed = useAnnouncements(announcementFilters);
  const managed = useManagedAnnouncements(
    { search: '', status: 'published', sort: 'priority', page: 1 },
    management,
  );
  const announcementQuery = management ? managed : feed;
  const recentAnnouncements = (announcementQuery.data?.items ?? []).slice(0, 3);
  const upcomingClasses = (schedules.data?.items ?? []).slice(0, 3);

  return (
    <section className="mt-8 grid gap-5 xl:grid-cols-2" aria-label="Academic engagement overview">
      <Card className="min-w-0 p-5" tone="blue">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <CardHeader
            className="min-w-0"
            description="Academic timetable"
            icon={<BookOpen size={19} />}
            title="Upcoming classes"
            tone="blue"
          />
          <Link className={buttonClassName('secondary', 'shrink-0')} to="/app/schedules">
            My schedule
          </Link>
        </div>
        {schedules.isLoading ? (
          <Skeleton className="mt-5 h-36" />
        ) : upcomingClasses.length ? (
          <div className="mt-5 grid gap-3">
            {upcomingClasses.map((schedule) => (
              <Link
                className="flex min-h-18 min-w-0 items-center gap-4 rounded-xl border border-blue-200 bg-blue-100/65 p-3 transition hover:border-blue-500 dark:border-blue-800 dark:bg-blue-950/50"
                key={schedule.id}
                to="/app/schedules"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {schedule.courseCode} · {schedule.courseTitle}
                  </span>
                  <span className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
                    <Clock3 size={13} /> {new Date(schedule.startsAt).toLocaleString()} ·{' '}
                    {schedule.venue}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No classes in the next 14 days"
              description="New timetable entries will appear here automatically."
            />
          </div>
        )}
      </Card>

      <Card className="min-w-0 p-5" tone="violet">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <CardHeader
            className="min-w-0"
            description="Institution communication"
            icon={<Megaphone size={19} />}
            title="Recent announcements"
            tone="violet"
          />
          <Link className={buttonClassName('secondary', 'shrink-0')} to="/app/announcements">
            View all
          </Link>
        </div>
        {announcementQuery.isLoading ? (
          <Skeleton className="mt-5 h-36" />
        ) : recentAnnouncements.length ? (
          <div className="mt-5 grid gap-3">
            {recentAnnouncements.map((announcement) => (
              <Link
                className="flex min-h-18 min-w-0 items-start gap-4 rounded-xl border border-violet-200 bg-violet-100/65 p-3 transition hover:border-violet-500 dark:border-violet-800 dark:bg-violet-950/50"
                key={announcement.id}
                to="/app/announcements"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  {announcement.acknowledgementRequired ? (
                    <BellRing size={18} />
                  ) : (
                    <Megaphone size={18} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{announcement.title}</span>
                    <Badge
                      tone={
                        announcement.priority === 'urgent'
                          ? 'danger'
                          : announcement.priority === 'high'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {announcement.priority}
                    </Badge>
                  </span>
                  <span className="mt-1 line-clamp-1 block text-xs text-slate-500">
                    {announcement.message}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No recent announcements"
              description="Published notices for your academic scope will appear here."
            />
          </div>
        )}
      </Card>
    </section>
  );
}
