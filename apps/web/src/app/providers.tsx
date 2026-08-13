import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { ThemeProvider } from '../contexts/theme-context.js';
import { RealtimeProvider } from './realtime-provider.js';
import { ConnectivityStatus } from '../components/connectivity-status.js';
import { AuthSessionProvider } from './auth-session-provider.js';
import { DashboardToastProvider } from '../contexts/dashboard-toast-context.js';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthSessionProvider>
          <DashboardToastProvider>
            <RealtimeProvider>{children}</RealtimeProvider>
          </DashboardToastProvider>
        </AuthSessionProvider>
        <ConnectivityStatus />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
