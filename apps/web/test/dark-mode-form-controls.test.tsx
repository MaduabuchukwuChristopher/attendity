import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../src/contexts/theme-context.js';
import ReportsPage from '../src/features/reports/reports-page.js';
import StudentWorkspacePage from '../src/features/portals/student-workspace-page.js';
import { useAuthStore } from '../src/store/auth-store.js';

vi.mock('../src/api/client.js', () => ({
  apiClient: {
    get: vi.fn(() => new Promise(() => undefined)),
    post: vi.fn(() => new Promise(() => undefined)),
  },
}));

function renderDashboard(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter>{page}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('dashboard form controls in dark mode', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession(
      {
        id: 'student-1',
        universityId: 'university-1',
        email: 'student@attendity.test',
        fullName: 'Demo Student',
        role: 'student',
      },
      'test-token',
    );
  });

  it('keeps the manual check-in placeholder readable', () => {
    renderDashboard(<StudentWorkspacePage />);
    expect(screen.getByLabelText('Manual check-in code')).toHaveClass(
      'placeholder:text-slate-500',
      'dark:placeholder:text-slate-400',
      'dark:text-slate-100',
    );
  });

  it('keeps report type and date values readable', () => {
    renderDashboard(<ReportsPage />);
    expect(screen.getByLabelText('Report type')).toHaveClass('dark:text-slate-100');
    expect(screen.getByLabelText('From')).toHaveClass(
      'dark:text-slate-100',
      'dark:[color-scheme:dark]',
    );
    expect(screen.getByLabelText('To')).toHaveClass(
      'dark:text-slate-100',
      'dark:[color-scheme:dark]',
    );
  });
});
