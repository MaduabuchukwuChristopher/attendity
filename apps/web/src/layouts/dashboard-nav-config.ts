import type { AuthenticatedUser, InstitutionTerminology, Permission } from '@qr/types';
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  PartyPopper,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCircle,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface DashboardNavItem {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly to: string;
}

export interface DashboardNavGroup {
  readonly label: string;
  readonly items: readonly DashboardNavItem[];
}

interface CandidateDashboardNavGroup {
  readonly label: string;
  readonly items: readonly (DashboardNavItem & { readonly visible: boolean })[];
}

function roleHome(role: AuthenticatedUser['role']): string {
  if (role === 'lecturer') return '/app/lecturer';
  if (role === 'student') return '/app/student';
  if (role === 'examiner') return '/app/examiner';
  return '/app';
}

export function buildDashboardNavigation(
  user: AuthenticatedUser,
  permissions: readonly Permission[],
  terminology?: InstitutionTerminology,
): readonly DashboardNavGroup[] {
  const permits = (permission: Permission) => permissions.includes(permission);
  const management = [
    'super_admin',
    'university_admin',
    'faculty_admin',
    'department_admin',
  ].includes(user.role);
  const institutionAdministration = user.role === 'super_admin' || user.role === 'university_admin';
  const groups: readonly CandidateDashboardNavGroup[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Workspace', icon: LayoutDashboard, to: roleHome(user.role), visible: true },
      ],
    },
    {
      label: 'Academic operations',
      items: [
        {
          label: 'Institution structure',
          icon: Building2,
          to: '/app/academic-structure',
          visible: permits('courses:read') && management,
        },
        {
          label: terminology?.departmentPlural ?? 'Departments',
          icon: Building2,
          to: '/app/departments',
          visible: permits('courses:read') && management,
        },
        {
          label: terminology?.coursePlural ?? 'Courses',
          icon: BookOpen,
          to: '/app/courses',
          visible: permits('courses:read'),
        },
        {
          label: 'Curriculum',
          icon: GraduationCap,
          to: '/app/curriculum',
          visible: permits('courses:write') && institutionAdministration,
        },
        {
          label: 'Class schedules',
          icon: CalendarDays,
          to: '/app/schedules',
          visible: permits('attendance:read'),
        },
        { label: 'People', icon: Users, to: '/app/users', visible: permits('users:read') },
        {
          label: 'Invite staff',
          icon: UserPlus,
          to: '/app/users',
          visible: permits('users:write') && institutionAdministration,
        },
        {
          label: 'Registrations',
          icon: ClipboardList,
          to: '/app/registrations',
          visible: permits('users:read') && permits('courses:read'),
        },
      ],
    },
    {
      label: 'Insight and records',
      items: [
        {
          label: 'Analytics',
          icon: BarChart3,
          to: '/app/analytics',
          visible: permits('analytics:read'),
        },
        { label: 'Reports', icon: FileText, to: '/app/reports', visible: permits('reports:read') },
        {
          label: 'Attendance clearance',
          icon: ShieldCheck,
          to: '/app/clearance',
          visible: permits('reports:read'),
        },
      ],
    },
    {
      label: 'Engagement',
      items: [
        { label: 'Events', icon: PartyPopper, to: '/app/events', visible: permits('events:read') },
        {
          label: 'Announcements',
          icon: Megaphone,
          to: '/app/announcements',
          visible: permits('announcements:read'),
        },
        {
          label: 'Notifications',
          icon: Bell,
          to: '/app/notifications',
          visible: permits('notifications:read'),
        },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'My profile', icon: UserCircle, to: '/app/profile', visible: true },
        { label: 'Security', icon: ShieldCheck, to: '/app/account', visible: true },
        {
          label: 'Institution settings',
          icon: Settings,
          to: '/app/settings',
          visible: permits('settings:read') && permits('settings:write'),
        },
        { label: 'Audit logs', icon: ScrollText, to: '/app/audit', visible: permits('audit:read') },
      ],
    },
  ];

  return groups
    .map((group) => ({
      label: group.label,
      items: group.items
        .filter((item) => item.visible)
        .map((item) => ({ label: item.label, icon: item.icon, to: item.to })),
    }))
    .filter((group) => group.items.length > 0);
}
