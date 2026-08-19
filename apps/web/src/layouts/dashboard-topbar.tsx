import type { AuthenticatedUser } from '@qr/types';
import { Bell, LogOut, Menu, Moon, ShieldCheck, Sun, UserCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { UserAvatar } from '../components/user-avatar.js';

interface DashboardTopbarProps {
  readonly canViewNotifications: boolean;
  readonly canViewReports: boolean;
  readonly institutionName: string;
  readonly onMenu: () => void;
  readonly onSignOut: (allDevices: boolean) => void;
  readonly onToggleTheme: () => void;
  readonly signingOut: boolean;
  readonly theme: 'light' | 'dark' | 'system';
  readonly unreadNotifications: number;
  readonly user: AuthenticatedUser;
}

export function DashboardTopbar({
  canViewNotifications,
  canViewReports,
  institutionName,
  onMenu,
  onSignOut,
  onToggleTheme,
  signingOut,
  theme,
  unreadNotifications,
  user,
}: DashboardTopbarProps) {
  return (
    <header className="app-topbar sticky top-0 z-40 flex min-h-18 min-w-0 w-full max-w-full items-center justify-between border-b border-emerald-700 bg-university-navy px-3 text-white shadow-lg shadow-slate-950/10 dark:border-emerald-500 dark:bg-slate-950 sm:px-6">
      <button
        aria-label="Open navigation"
        className="grid size-10 place-items-center rounded-xl text-white hover:bg-white/10 dark:text-white dark:hover:bg-white/10 lg:hidden"
        onClick={onMenu}
        type="button"
      >
        <Menu size={21} />
      </button>
      <div className="hidden min-w-0 lg:block">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-academic-gold dark:text-amber-300">
          Attendity workspace
        </p>
        <p className="mt-0.5 max-w-80 truncate text-xs text-emerald-100 dark:text-slate-300">
          {institutionName}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {canViewNotifications ? (
          <NavLink
            aria-label="Notifications"
            className="relative grid size-10 place-items-center rounded-xl text-white hover:bg-white/10 dark:text-white dark:hover:bg-white/10"
            to="/app/notifications"
          >
            <Bell size={18} />
            {unreadNotifications ? (
              <span className="absolute right-0 top-0 grid min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white dark:text-white">
                {Math.min(unreadNotifications, 99)}
              </span>
            ) : null}
          </NavLink>
        ) : null}
        <button
          aria-label="Toggle theme"
          className="grid size-10 place-items-center rounded-xl text-white hover:bg-white/10 dark:text-white dark:hover:bg-white/10"
          onClick={onToggleTheme}
          type="button"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {canViewReports ? (
          <NavLink
            className="hidden min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-700 dark:text-white sm:inline-flex"
            to="/app/reports"
          >
            View reports
          </NavLink>
        ) : null}
        <details className="relative">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-1.5 text-white hover:bg-white/10 dark:text-white dark:hover:bg-white/10 sm:px-2">
            <UserAvatar
              fullName={user.fullName}
              {...(user.photoUrl ? { photoUrl: user.photoUrl } : {})}
            />
            <span className="hidden max-w-32 truncate text-sm font-semibold md:block">
              {user.fullName}
            </span>
          </summary>
          <div className="absolute right-0 mt-2 w-[min(17rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-surface p-2 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-dark-surface dark:text-slate-100">
            <div className="border-b border-border px-3 py-3 dark:border-slate-700">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-primary dark:text-emerald-300">
                {user.role.replaceAll('_', ' ')}
              </p>
            </div>
            <NavLink
              className="mt-2 flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              to="/app/account"
            >
              <UserCircle size={17} /> My profile
            </NavLink>
            <NavLink
              className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              to="/app/account"
            >
              <ShieldCheck size={17} /> Security and devices
            </NavLink>
            <button
              className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              disabled={signingOut}
              onClick={() => onSignOut(false)}
              type="button"
            >
              <LogOut size={17} /> Sign out
            </button>
            <button
              className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm text-danger hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
              disabled={signingOut}
              onClick={() => onSignOut(true)}
              type="button"
            >
              <ShieldCheck size={17} /> Sign out all devices
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
