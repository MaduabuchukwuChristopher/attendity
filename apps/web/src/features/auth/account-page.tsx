import type { ApiResponse } from '@qr/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, ErrorState, Input, Skeleton } from '@qr/ui';
import { Laptop, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../api/client.js';
import { FormActionFeedback } from '../../components/form-action-feedback.js';
import { MutationFormFeedback } from '../../components/mutation-form-feedback.js';
import { useDashboardToast } from '../../contexts/dashboard-toast-context.js';
import { DashboardLayout } from '../../layouts/dashboard-layout.js';
import { useAuthStore } from '../../store/auth-store.js';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, passwordRequirements } from './auth-utils.js';
import { ReminderPreferencesPanel } from '../notifications/reminder-preferences-panel.js';
import { EventNotificationPreferencesPanel } from '../notifications/event-notification-preferences-panel.js';

interface AccountSession {
  readonly sessionId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}
const formatter = new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

export default function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { notify } = useDashboardToast();
  const [passwordError, setPasswordError] = useState('');
  const queryClient = useQueryClient();
  const sessions = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () =>
      (await apiClient.get<ApiResponse<readonly AccountSession[]>>('/auth/sessions')).data.data,
  });
  const revoke = useMutation({
    mutationFn: (sessionId: string) => apiClient.delete(`/auth/sessions/${sessionId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });
  const changePassword = useMutation({
    mutationFn: (body: { readonly currentPassword: string; readonly newPassword: string }) =>
      apiClient.post('/auth/change-password', body),
    onSuccess: () => {
      notify({
        tone: 'success',
        title: 'Password changed',
        message: 'Your password was changed and all device sessions were signed out.',
      });
      useAuthStore.getState().clearSession();
      queryClient.clear();
      void navigate('/login', { replace: true });
    },
    onError: (error) =>
      setPasswordError(apiErrorMessage(error, 'Your password could not be changed.')),
  });
  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    const data = new FormData(event.currentTarget);
    const formText = (key: string) => {
      const value = data.get(key);
      return typeof value === 'string' ? value : '';
    };
    const currentPassword = formText('currentPassword');
    const newPassword = formText('newPassword');
    const confirmPassword = formText('confirmPassword');
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (!passwordRequirements.every((requirement) => requirement.test(newPassword))) {
      setPasswordError('The new password does not meet the security requirements.');
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };
  return (
    <DashboardLayout>
      <p className="text-sm font-semibold text-primary">Identity and security</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Your account</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-6">
          <div className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-xl font-bold text-primary dark:bg-emerald-950">
            {user?.fullName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <h2 className="mt-5 text-xl font-bold">{user?.fullName}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
          <p className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-primary dark:bg-emerald-950">
            {user?.role.replaceAll('_', ' ')}
          </p>
          <div className="mt-6 flex gap-3 border-t border-border pt-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <ShieldCheck className="shrink-0 text-primary" size={20} />
            Your access is protected by short-lived access tokens and revocable device sessions.
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-bold">Active device sessions</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Review and revoke devices that should no longer have access.
          </p>
          {sessions.isLoading ? (
            <div className="mt-6 grid gap-3" aria-busy="true">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : sessions.isError ? (
            <div className="mt-6">
              <ErrorState
                title="Sessions unavailable"
                description="Your device sessions could not be loaded."
                retry={() => void sessions.refetch()}
              />
            </div>
          ) : (
            <ul className="mt-6 grid gap-3">
              {sessions.data?.map((session) => (
                <li
                  className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-100/75 to-emerald-100/65 p-4 dark:border-blue-800 dark:from-blue-950/55 dark:to-emerald-950/45 sm:flex-row sm:items-center"
                  key={session.sessionId}
                >
                  <Laptop aria-hidden="true" className="shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {session.userAgent ?? 'Browser session'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Started {formatter.format(new Date(session.createdAt))}
                      {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                    </p>
                  </div>
                  <Button
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(session.sessionId)}
                    variant="secondary"
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <MutationFormFeedback
              error={revoke.error}
              errorFallback="The selected session could not be revoked."
              status={revoke.isSuccess ? 'success' : revoke.isError ? 'error' : 'idle'}
              submissionId={revoke.submittedAt}
              successMessage="The selected device session was revoked successfully."
              successTitle="Session revoked"
            />
          </div>
        </Card>
      </div>
      <Card className="mt-6 max-w-2xl p-6">
        <h2 className="text-lg font-bold">Change password</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Changing your password signs out every device, including this one.
        </p>
        <form className="mt-6 grid gap-5" onSubmit={submitPassword}>
          <Input
            autoComplete="current-password"
            label="Current password"
            name="currentPassword"
            required
            type="password"
          />
          <Input
            autoComplete="new-password"
            label="New password"
            name="newPassword"
            required
            type="password"
          />
          <Input
            autoComplete="new-password"
            label="Confirm new password"
            name="confirmPassword"
            required
            type="password"
          />
          <p className="text-xs leading-5 text-slate-500">
            Use at least 12 characters with uppercase and lowercase letters, a number, and a symbol.
          </p>
          <FormActionFeedback
            message={passwordError || undefined}
            status={passwordError ? 'error' : 'idle'}
          />
          <Button className="w-fit" disabled={changePassword.isPending} type="submit">
            {changePassword.isPending ? 'Changing password…' : 'Change password'}
          </Button>
        </form>
      </Card>
      {user?.role === 'student' || user?.role === 'lecturer' ? <ReminderPreferencesPanel /> : null}
      <EventNotificationPreferencesPanel />
    </DashboardLayout>
  );
}
