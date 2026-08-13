import type { Permission, UserRole } from '@qr/types';
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RouteErrorPage } from '../components/route-error-page.js';
import { GuestRoute, ProtectedRoute, RootRedirect } from '../features/auth/route-access.js';

const LoginPage = lazy(() => import('../features/auth/login-page.js'));
const RegisterPage = lazy(() => import('../features/auth/register-page.js'));
const ForgotPasswordPage = lazy(() => import('../features/auth/forgot-password-page.js'));
const ResetPasswordPage = lazy(() => import('../features/auth/reset-password-page.js'));
const VerifyEmailPage = lazy(() => import('../features/auth/verify-email-page.js'));
const ResendVerificationPage = lazy(() => import('../features/auth/resend-verification-page.js'));
const AcceptInvitationPage = lazy(() => import('../features/auth/accept-invitation-page.js'));
const AccountPage = lazy(() => import('../features/auth/account-page.js'));
const NotFoundPage = lazy(() => import('../components/not-found-page.js'));
const PortalPage = lazy(() => import('../features/portals/portal-page.js'));
const AcademicManagementPage = lazy(
  () => import('../features/academic/academic-management-page.js'),
);
const ClassSchedulesPage = lazy(() => import('../features/academic/class-schedules-page.js'));
const InstitutionStructurePage = lazy(
  () => import('../features/academic/institution-structure-page.js'),
);
const UserManagementPage = lazy(() => import('../features/users/user-management-page.js'));
const RegistrationManagementPage = lazy(
  () => import('../features/registrations/registration-management-page.js'),
);
const LecturerWorkspacePage = lazy(() => import('../features/portals/lecturer-workspace-page.js'));
const StudentWorkspacePage = lazy(() => import('../features/portals/student-workspace-page.js'));
const ExaminerWorkspacePage = lazy(() => import('../features/portals/examiner-workspace-page.js'));
const SettingsPage = lazy(() => import('../features/settings/settings-page.js'));
const AnalyticsDashboardPage = lazy(
  () => import('../features/analytics/analytics-dashboard-page.js'),
);
const ReportsPage = lazy(() => import('../features/reports/reports-page.js'));
const NotificationCenterPage = lazy(
  () => import('../features/notifications/notification-center-page.js'),
);
const AnnouncementsPage = lazy(() => import('../features/announcements/announcements-page.js'));
const EventsPage = lazy(() => import('../features/events/events-page.js'));
const ClearancePage = lazy(() => import('../features/clearance/clearance-page.js'));
const AuditLogPage = lazy(() => import('../features/audit/audit-log-page.js'));
const ProfilePage = lazy(() => import('../features/profiles/profile-page.js'));
const CurriculumManagementPage = lazy(
  () => import('../features/academic/curriculum-management-page.js'),
);
const PublicClearanceVerificationPage = lazy(
  () => import('../features/clearance/public-clearance-verification-page.js'),
);

function RouteLoader() {
  return (
    <main
      aria-busy="true"
      className="grid min-h-screen place-items-center bg-background dark:bg-dark-background"
    >
      Loading Attendity…
    </main>
  );
}
function load(element: ReactNode) {
  return <Suspense fallback={<RouteLoader />}>{element}</Suspense>;
}
function guest(element: ReactNode) {
  return <GuestRoute>{load(element)}</GuestRoute>;
}
function protectedPage(
  element: ReactNode,
  access: {
    readonly permissions?: readonly Permission[];
    readonly roles?: readonly UserRole[];
  } = {},
) {
  return (
    <ProtectedRoute
      {...(access.permissions ? { permissions: access.permissions } : {})}
      {...(access.roles ? { roles: access.roles } : {})}
    >
      {load(element)}
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect />, errorElement: <RouteErrorPage /> },
  { path: '/login', element: guest(<LoginPage />), errorElement: <RouteErrorPage /> },
  { path: '/register', element: guest(<RegisterPage />), errorElement: <RouteErrorPage /> },
  {
    path: '/forgot-password',
    element: guest(<ForgotPasswordPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/reset-password',
    element: guest(<ResetPasswordPage />),
    errorElement: <RouteErrorPage />,
  },
  { path: '/verify-email', element: guest(<VerifyEmailPage />), errorElement: <RouteErrorPage /> },
  {
    path: '/resend-verification',
    element: guest(<ResendVerificationPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/accept-invitation',
    element: guest(<AcceptInvitationPage />),
    errorElement: <RouteErrorPage />,
  },
  { path: '/app', element: protectedPage(<PortalPage />), errorElement: <RouteErrorPage /> },
  {
    path: '/app/account',
    element: protectedPage(<AccountPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/profile',
    element: protectedPage(<ProfilePage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/academic-structure',
    element: protectedPage(<InstitutionStructurePage />, { permissions: ['courses:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/departments',
    element: protectedPage(<AcademicManagementPage type="departments" />, {
      permissions: ['courses:read'],
    }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/courses',
    element: protectedPage(<AcademicManagementPage type="courses" />, {
      permissions: ['courses:read'],
    }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/curriculum',
    element: protectedPage(<CurriculumManagementPage />, {
      permissions: ['courses:read', 'courses:write'],
    }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/schedules',
    element: protectedPage(<ClassSchedulesPage />, { permissions: ['attendance:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/users',
    element: protectedPage(<UserManagementPage />, { permissions: ['users:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/registrations',
    element: protectedPage(<RegistrationManagementPage />, {
      permissions: ['courses:read', 'users:read'],
    }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/lecturer',
    element: protectedPage(<LecturerWorkspacePage />, { roles: ['lecturer'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/student',
    element: protectedPage(<StudentWorkspacePage />, { roles: ['student'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/examiner',
    element: protectedPage(<ExaminerWorkspacePage />, { roles: ['examiner'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/settings',
    element: protectedPage(<SettingsPage />, { permissions: ['settings:read', 'settings:write'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/analytics',
    element: protectedPage(<AnalyticsDashboardPage />, { permissions: ['analytics:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/reports',
    element: protectedPage(<ReportsPage />, { permissions: ['reports:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/clearance',
    element: protectedPage(<ClearancePage />, { permissions: ['reports:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/announcements',
    element: protectedPage(<AnnouncementsPage />, { permissions: ['announcements:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/events',
    element: protectedPage(<EventsPage />, { permissions: ['events:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/audit',
    element: protectedPage(<AuditLogPage />, { permissions: ['audit:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app/notifications',
    element: protectedPage(<NotificationCenterPage />, { permissions: ['notifications:read'] }),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/verify/clearance/:reference',
    element: load(<PublicClearanceVerificationPage />),
    errorElement: <RouteErrorPage />,
  },
  { path: '*', element: load(<NotFoundPage />), errorElement: <RouteErrorPage /> },
]);
