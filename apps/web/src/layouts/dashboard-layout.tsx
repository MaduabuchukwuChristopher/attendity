import { ROLE_PERMISSIONS } from '@qr/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { useTheme } from '../contexts/theme-context.js';
import { useNotifications } from '../features/notifications/use-notifications.js';
import { useInstitutionSettings } from '../features/settings/use-institution-settings.js';
import { useAuthStore } from '../store/auth-store.js';
import { buildDashboardNavigation } from './dashboard-nav-config.js';
import { DashboardSidebar } from './dashboard-sidebar.js';
import { DashboardTopbar } from './dashboard-topbar.js';

export function DashboardLayout({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { preference, setPreference } = useTheme();
  const user = useAuthStore((state) => state.user);
  const institutionSettings = useInstitutionSettings(Boolean(user));
  const permissions = user ? ROLE_PERMISSIONS[user.role] : [];
  const canViewNotifications = permissions.includes('notifications:read');
  const notificationSummary = useNotifications('unread', 1, 10, canViewNotifications);
  const institutionName =
    institutionSettings.data?.institutionName ?? 'Institution attendance operations';
  const groups = user
    ? buildDashboardNavigation(user, permissions, institutionSettings.data?.terminology)
    : [];

  const signOut = async (allDevices: boolean) => {
    setSigningOut(true);
    try {
      await apiClient.post(allDevices ? '/auth/logout-all' : '/auth/logout');
    } finally {
      useAuthStore.getState().clearSession();
      queryClient.clear();
      void navigate('/login', { replace: true });
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-900 dark:bg-dark-background dark:text-slate-100">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {user ? (
        <DashboardSidebar
          groups={groups}
          institutionName={institutionName}
          onClose={() => setOpen(false)}
          open={open}
          user={user}
        />
      ) : null}
      {open ? (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-20 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}
      <div className="lg:pl-72">
        {user ? (
          <DashboardTopbar
            canViewNotifications={canViewNotifications}
            canViewReports={permissions.includes('reports:read')}
            institutionName={institutionName}
            onMenu={() => setOpen(true)}
            onSignOut={(allDevices) => void signOut(allDevices)}
            onToggleTheme={() => setPreference(preference === 'dark' ? 'light' : 'dark')}
            signingOut={signingOut}
            theme={preference}
            unreadNotifications={notificationSummary.data?.unread ?? 0}
            user={user}
          />
        ) : null}
        <main className="mx-auto max-w-7xl p-5 sm:p-8" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
