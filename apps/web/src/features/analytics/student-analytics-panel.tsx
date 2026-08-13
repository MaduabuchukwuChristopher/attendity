import { Award, BarChart3, BookOpenCheck, TrendingUp } from 'lucide-react';
import { Card, CardHeader, ComparisonBarChart, EmptyState, MetricCard } from '@qr/ui';

export interface StudentAnalyticsCourse {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly attendanceRequirement: number;
  readonly sessionsHeld: number;
  readonly sessionsAttended: number;
  readonly attendancePercentage: number;
  readonly eligible: boolean;
}

export function StudentAnalyticsPanel({
  courses,
}: {
  readonly courses: readonly StudentAnalyticsCourse[];
}) {
  const average = courses.length
    ? Math.round(
        courses.reduce((total, course) => total + course.attendancePercentage, 0) / courses.length,
      )
    : 0;
  const eligible = courses.filter((course) => course.eligible).length;

  return (
    <section className="mt-9" aria-labelledby="student-analytics-title">
      <div>
        <p className="text-sm font-semibold text-primary">Personal academic intelligence</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight" id="student-analytics-title">
          My attendance pulse
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          A course-by-course view of your verified attendance and examination standing.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<BookOpenCheck aria-hidden="true" size={19} />}
          label="Registered courses"
          supportingText="Approved courses in your current record"
          tone="navy"
          value={courses.length}
        />
        <MetricCard
          icon={<TrendingUp aria-hidden="true" size={19} />}
          label="Average attendance"
          supportingText="Average across registered courses"
          tone={average >= 75 ? 'green' : average >= 60 ? 'gold' : 'rose'}
          value={`${average}%`}
        />
        <MetricCard
          icon={<Award aria-hidden="true" size={19} />}
          label="Courses eligible"
          supportingText="Currently meeting examination requirements"
          tone={courses.length > 0 && eligible === courses.length ? 'green' : 'violet'}
          value={`${eligible}/${courses.length}`}
        />
      </div>

      <Card className="mt-5 p-5" tone="violet">
        <CardHeader
          description="Course performance"
          icon={<BarChart3 size={19} />}
          title="Attendance against your timetable"
          tone="violet"
        />
        {courses.length ? (
          <ComparisonBarChart
            data={courses.slice(0, 8).map((course) => ({
              color:
                course.attendancePercentage >= course.attendanceRequirement
                  ? '#0B6B4F'
                  : course.attendancePercentage >= 60
                    ? '#C58B24'
                    : '#C45568',
              label: course.code,
              value: course.attendancePercentage,
            }))}
            label="Personal course attendance comparison"
          />
        ) : (
          <div className="mt-5">
            <EmptyState
              description="Approved course registrations will populate your personal chart automatically."
              title="No course analytics yet"
            />
          </div>
        )}
      </Card>
    </section>
  );
}
