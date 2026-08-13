import { Card, CardHeader } from '@qr/ui';
import { Activity, CalendarDays } from 'lucide-react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';

interface AttendanceHistoryProps {
  readonly days: Readonly<Record<string, number>>;
}

function intensity(count: number): string {
  if (count === 0) return 'bg-slate-100 dark:bg-slate-800';
  if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900';
  if (count === 2) return 'bg-emerald-500 dark:bg-emerald-600';
  return 'bg-primary';
}

export function AttendanceHistory({ days }: AttendanceHistoryProps) {
  const today = new Date();
  const heatmapDays = eachDayOfInterval({
    start: startOfWeek(subDays(today, 111), { weekStartsOn: 1 }),
    end: endOfWeek(today, { weekStartsOn: 1 }),
  });
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(today), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(today), { weekStartsOn: 1 }),
  });
  const month = today.getMonth();

  return (
    <section className="mt-8 grid gap-5 xl:grid-cols-2">
      <Card className="overflow-hidden p-5" tone="green">
        <CardHeader
          description="Your check-in consistency across the last sixteen weeks."
          icon={<Activity size={20} />}
          title="Attendance activity"
          tone="green"
        />
        <div className="mt-5 overflow-x-auto pb-2">
          <div
            aria-label="Sixteen-week attendance heatmap"
            className="grid w-max grid-flow-col grid-rows-7 gap-1"
            role="img"
          >
            {heatmapDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const count = days[key] ?? 0;
              return (
                <span
                  aria-label={`${format(day, 'd MMMM yyyy')}: ${count} check-in${count === 1 ? '' : 's'}`}
                  className={`size-3 rounded-sm ${intensity(count)}`}
                  key={key}
                  title={`${format(day, 'd MMM yyyy')} — ${count} check-in${count === 1 ? '' : 's'}`}
                />
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>Less</span>
          {[0, 1, 2, 3].map((count) => (
            <span className={`size-3 rounded-sm ${intensity(count)}`} key={count} />
          ))}
          <span>More</span>
        </div>
      </Card>

      <Card className="p-5" tone="blue">
        <CardHeader
          description="Monthly attendance calendar."
          icon={<CalendarDays size={20} />}
          title={format(today, 'MMMM yyyy')}
          tone="blue"
        />
        <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span className="pb-2 font-medium text-slate-500" key={day}>
              {day}
            </span>
          ))}
          {calendarDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const count = days[key] ?? 0;
            return (
              <span
                aria-label={`${format(day, 'd MMMM')}: ${count} check-ins`}
                className={`grid aspect-square place-items-center rounded-lg ${
                  day.getMonth() !== month
                    ? 'text-slate-300 dark:text-slate-700'
                    : count
                      ? 'bg-primary font-semibold text-white'
                      : 'bg-slate-50 dark:bg-slate-800'
                }`}
                key={key}
              >
                {format(day, 'd')}
              </span>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
