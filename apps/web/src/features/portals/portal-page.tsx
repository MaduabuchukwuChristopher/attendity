import { buttonClassName, Card, ErrorState, MetricCard, Skeleton } from '@qr/ui';
import type { UserRole } from '@qr/types';
import { Link, Navigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  Radio,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { ROLE_PERMISSIONS } from '@qr/shared';
import { useAuthStore } from '../../store/auth-store.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { usePortalSummary } from './use-portal-summary.js';
import { EventDashboardPanel } from '../events/event-dashboard-panel.js';
import { EngagementDashboardPanel } from './engagement-dashboard-panel.js';
import { DashboardAnalyticsOverview } from '../analytics/dashboard-analytics-overview.js';

const portalCopy: Record<UserRole, { title: string; description: string }> = {
  super_admin: {
    title: 'System administration',
    description: 'Institution management, platform health, and tenant governance.',
  },
  university_admin: {
    title: 'Institution administration',
    description: 'Academic structure, people, policies, and attendance oversight.',
  },
  faculty_admin: {
    title: 'Faculty administration',
    description: 'Faculty-level attendance and academic operations.',
  },
  department_admin: {
    title: 'Department administration',
    description: 'Departmental attendance and course coordination.',
  },
  lecturer: {
    title: 'Lecturer workspace',
    description: 'Courses, sessions, and live attendance operations.',
  },
  student: {
    title: 'Student attendance',
    description: 'Your attendance record, course progress, and eligibility.',
  },
  examiner: {
    title: 'Examiner verification',
    description: 'Fast, server-verified attendance clearance checks.',
  },
  viewer: { title: 'Attendance overview', description: 'Read-only academic attendance insight.' },
};

export default function PortalPage() {
  const user = useAuthStore((state) => state.user);
  const isDedicatedRole =
    user?.role === 'lecturer' || user?.role === 'student' || user?.role === 'examiner';
  const summary = usePortalSummary(user !== null && !isDedicatedRole);
  if (!user)
    return (
      <DashboardLayout>
        <ErrorState
          title="Your session has ended"
          description="Sign in to access your institution workspace."
        />
      </DashboardLayout>
    );
  if (user.role === 'lecturer') return <Navigate replace to="/app/lecturer" />;
  if (user.role === 'student') return <Navigate replace to="/app/student" />;
  if (user.role === 'examiner') return <Navigate replace to="/app/examiner" />;
  const copy = portalCopy[user.role];
  const permissions = ROLE_PERMISSIONS[user.role];
  if (summary.isError)
    return (
      <DashboardLayout>
        <ErrorState
          title="We could not load your portal"
          description="Please check your connection and try again."
          retry={() => void summary.refetch()}
        />
      </DashboardLayout>
    );
  const cards = summary.data
    ? [
        {
          label: 'Active students',
          value: summary.data.students,
          tone: 'green' as const,
          icon: UserRoundCheck,
          detail: 'Verified active student accounts',
        },
        {
          label: 'Lecturers',
          value: summary.data.lecturers,
          tone: 'blue' as const,
          icon: Users,
          detail: 'Academic staff with institution access',
        },
        {
          label: 'Departments',
          value: summary.data.departments,
          tone: 'violet' as const,
          icon: Building2,
          detail: 'Configured academic departments',
        },
        {
          label: 'Courses',
          value: summary.data.courses,
          tone: 'navy' as const,
          icon: BookOpen,
          detail: 'Courses available for attendance',
        },
        {
          label: 'Live sessions',
          value: summary.data.activeSessions,
          tone: 'gold' as const,
          icon: Radio,
          detail: 'Sessions open for check-in now',
        },
        {
          label: 'Pending registrations',
          value: summary.data.pendingRegistrations,
          tone: 'rose' as const,
          icon: ClipboardList,
          detail: 'Course registrations awaiting review',
        },
        {
          label: 'All people',
          value: summary.data.users,
          tone: 'blue' as const,
          icon: Users,
          detail: 'All institution user profiles',
        },
        {
          label: 'Unread notifications',
          value: summary.data.unreadNotifications,
          tone: 'gold' as const,
          icon: Bell,
          detail: 'Institution updates awaiting attention',
        },
      ]
    : [];
  return (
    <DashboardLayout>
      <p className="text-sm font-semibold text-primary">{user.fullName}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{copy.title}</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{copy.description}</p>
      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading
          ? ['People', 'Departments', 'Courses', 'Notifications'].map((label) => (
              <Card className="p-5" key={label}>
                <Skeleton className="h-2 w-20" />
                <h2 className="mt-5 font-semibold">{label}</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Loading institution data securely.
                </p>
              </Card>
            ))
          : cards.map(({ detail, icon: Icon, label, tone, value }) => (
              <MetricCard
                icon={<Icon aria-hidden="true" size={19} />}
                key={label}
                label={label}
                supportingText={detail}
                tone={tone}
                value={value}
              />
            ))}
      </section>
      {permissions.includes('analytics:read') ? (
        <DashboardAnalyticsOverview
          description="Verified attendance movement, course performance, and student risk in one institutional view."
          heading="Institution attendance pulse"
        />
      ) : null}
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">Operational shortcuts</p>
            <h2 className="mt-1 text-xl font-bold">Continue managing attendance</h2>
          </div>
          <Link className={buttonClassName('secondary')} to="/app/analytics">
            Open analytics
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: 'Academic structure',
              description: 'Review departments and course ownership.',
              icon: Building2,
              to: '/app/departments',
              visible: permissions.includes('courses:read'),
            },
            {
              title: 'Course catalogue',
              description: 'Manage courses, requirements, and lecturers.',
              icon: BookOpen,
              to: '/app/courses',
              visible: permissions.includes('courses:read'),
            },
            {
              title: 'People',
              description: 'Review staff and student account access.',
              icon: Users,
              to: '/app/users',
              visible: permissions.includes('users:read'),
            },
            {
              title: 'Registrations',
              description: 'Approve official course registrations.',
              icon: ClipboardList,
              to: '/app/registrations',
              visible: permissions.includes('users:read') && permissions.includes('courses:read'),
            },
          ]
            .filter((action) => action.visible)
            .map(({ title, description, icon: Icon, to }, index) => (
              <Link
                className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  index % 2 === 0
                    ? 'border-blue-200 bg-gradient-to-br from-blue-100 via-cyan-50 to-emerald-100 dark:border-blue-800 dark:from-blue-950 dark:via-slate-900 dark:to-emerald-950'
                    : 'border-violet-200 bg-gradient-to-br from-violet-100 via-blue-50 to-emerald-100 dark:border-violet-800 dark:from-violet-950 dark:via-slate-900 dark:to-emerald-950'
                }`}
                key={title}
                to={to}
              >
                <span
                  className={`grid size-11 place-items-center rounded-xl text-white shadow-lg ${index % 2 === 0 ? 'bg-blue-700 dark:bg-blue-400 dark:text-blue-950' : 'bg-violet-700 dark:bg-violet-400 dark:text-violet-950'}`}
                >
                  <Icon aria-hidden="true" size={22} />
                </span>
                <h3 className="mt-4 font-semibold text-blue-950 dark:text-blue-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              </Link>
            ))}
        </div>
        <Card className="mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center" tone="teal">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-primary dark:bg-emerald-950">
            <BarChart3 size={22} />
          </span>
          <div className="flex-1">
            <h3 className="font-semibold">Live institutional insight</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Attendance trends, student risks, and course performance are calculated from verified
              records.
            </p>
          </div>
          <Link className={buttonClassName('primary')} to="/app/reports">
            Generate a report
          </Link>
        </Card>
      </section>
      <EventDashboardPanel management />
      <EngagementDashboardPanel management />
    </DashboardLayout>
  );
}
