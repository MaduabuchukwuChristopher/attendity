import { ROLE_PERMISSIONS } from '@qr/shared';
import type { Permission, UserRole } from '@qr/types';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store.js';
import AccessDeniedPage from './access-denied-page.js';
import { roleHome } from './auth-utils.js';

function SessionLoader() {
  return (
    <main
      aria-busy="true"
      className="grid min-h-screen place-items-center bg-background dark:bg-dark-background"
    >
      Restoring your secure session…
    </main>
  );
}

export function GuestRoute({ children }: PropsWithChildren) {
  const { status, user } = useAuthStore();
  if (status === 'checking') return <SessionLoader />;
  if (status === 'authenticated' && user) return <Navigate replace to={roleHome(user.role)} />;
  return children;
}

export function ProtectedRoute({
  children,
  permissions = [],
  roles,
}: PropsWithChildren<{
  readonly permissions?: readonly Permission[];
  readonly roles?: readonly UserRole[];
}>) {
  const location = useLocation();
  const { status, user } = useAuthStore();
  if (status === 'checking') return <SessionLoader />;
  if (status !== 'authenticated' || !user)
    return <Navigate replace state={{ expired: true, from: location.pathname }} to="/login" />;
  const hasPermissions = permissions.every((permission) =>
    ROLE_PERMISSIONS[user.role].includes(permission),
  );
  const hasRole = !roles || roles.includes(user.role);
  if (!hasPermissions || !hasRole) return <AccessDeniedPage />;
  return children;
}

export function RootRedirect() {
  const { status, user } = useAuthStore();
  if (status === 'checking') return <SessionLoader />;
  return <Navigate replace to={user ? roleHome(user.role) : '/login'} />;
}
