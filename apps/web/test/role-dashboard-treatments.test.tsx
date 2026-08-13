import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExaminerWorkspacePage from '../src/features/portals/examiner-workspace-page.js';
import LecturerWorkspacePage from '../src/features/portals/lecturer-workspace-page.js';
import StudentWorkspacePage from '../src/features/portals/student-workspace-page.js';
import { useAuthStore } from '../src/store/auth-store.js';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn(() => new Promise(() => undefined)) }));

vi.mock('../src/api/client.js', () => ({
  apiClient: { get: apiGet, post: vi.fn() },
}));

vi.mock('../src/layouts/dashboard-layout.js', () => ({
  DashboardLayout: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../src/features/analytics/lecturer-insights-panel.js', () => ({
  LecturerInsightsPanel: () => null,
}));

vi.mock('../src/features/events/event-dashboard-panel.js', () => ({
  EventDashboardPanel: () => null,
}));

vi.mock('../src/features/portals/engagement-dashboard-panel.js', () => ({
  EngagementDashboardPanel: () => null,
}));

function renderPage(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('role dashboard treatments', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue({ data: { data: { courses: [], timeline: [] } } });
  });

  it('makes the student scanner and manual-code actions visually distinct', () => {
    useAuthStore.getState().setSession(
      {
        email: 'student@attendity.test',
        fullName: 'Demo Student',
        id: 'student-1',
        role: 'student',
        universityId: 'university-1',
      },
      'test-token',
    );
    renderPage(<StudentWorkspacePage />);

    const scanner = screen.getByRole('region', { name: 'Scan the live QR scanner' });
    expect(scanner.parentElement).toHaveClass('items-start');
    expect(scanner).toHaveClass('self-start');
    expect(scanner).toHaveClass(
      'from-emerald-50',
      'to-teal-100',
      'dark:from-emerald-950',
      'dark:to-teal-950',
    );
    expect(within(scanner).getByRole('button', { name: 'Open scanner' })).toHaveClass(
      'gap-2',
      'bg-primary',
    );
    expect(screen.getByRole('region', { name: 'Manual check-in card' })).toHaveClass(
      'from-amber-50',
      'to-orange-100',
      'dark:from-amber-950',
      'dark:to-orange-950',
      'self-start',
    );
    expect(screen.getByLabelText('Manual check-in code')).toHaveClass(
      'dark:placeholder:text-slate-400',
      'dark:text-slate-100',
    );
  });

  it('makes examiner scanning and archive search visible in dark mode', () => {
    useAuthStore.getState().setSession(
      {
        email: 'examiner@attendity.test',
        fullName: 'Demo Examiner',
        id: 'examiner-1',
        role: 'examiner',
        universityId: 'university-1',
      },
      'test-token',
    );
    renderPage(<ExaminerWorkspacePage />);

    const scanner = screen.getByRole('region', { name: 'Continuous clearance scanner scanner' });
    expect(scanner.parentElement).toHaveClass('items-start');
    expect(scanner).toHaveClass('self-start');
    expect(scanner).toHaveClass(
      'from-blue-50',
      'to-cyan-100',
      'dark:from-blue-950',
      'dark:to-cyan-950',
    );
    expect(within(scanner).getByRole('button', { name: 'Open scanner' })).toHaveClass('gap-2');
    expect(screen.getByRole('region', { name: 'Search the archive card' })).toHaveClass(
      'bg-violet-50',
      'dark:bg-violet-950',
      'self-start',
    );
    expect(screen.getByPlaceholderText('ACL-... or matric number')).toHaveClass(
      'placeholder:text-slate-500',
      'dark:placeholder:text-slate-400',
      'dark:text-slate-100',
    );
  });

  it('uses the shared dark-safe form treatment for every lecturer session select', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/portals/lecturer-workspace-page.tsx'),
      'utf8',
    );
    const sessionForm = source.slice(source.indexOf('<form className="grid gap-4"'));

    expect(sessionForm.match(/className=\{dashboardFormControlClassName\}/g)).toHaveLength(3);
  });

  it('uses semantic status, column, and row colors for lecturer recent sessions', async () => {
    useAuthStore.getState().setSession(
      {
        email: 'lecturer@attendity.test',
        fullName: 'Dr Ada Okafor',
        id: 'lecturer-1',
        role: 'lecturer',
        universityId: 'university-1',
      },
      'test-token',
    );
    apiGet.mockImplementation((url: string) => {
      if (url === '/attendance/lecturer')
        return Promise.resolve({
          data: {
            data: {
              courses: [],
              sessions: [
                {
                  attendanceCount: 0,
                  closesAt: '2026-08-12T09:00:00.000Z',
                  course: { code: 'CSC 405', title: 'Software Engineering' },
                  faceVerificationRequired: false,
                  gpsRequired: false,
                  id: 'session-closed',
                  openedAt: '2026-08-12T08:00:00.000Z',
                  qrMode: 'static',
                  qrRotatedAt: '2026-08-12T08:00:00.000Z',
                  qrRotationSeconds: 30,
                  status: 'closed',
                },
                {
                  attendanceCount: 12,
                  closesAt: '2026-08-12T11:00:00.000Z',
                  course: { code: 'CSC 407', title: 'Artificial Intelligence' },
                  faceVerificationRequired: false,
                  gpsRequired: false,
                  id: 'session-open',
                  openedAt: '2026-08-12T10:00:00.000Z',
                  qrMode: 'static',
                  qrRotatedAt: '2026-08-12T10:00:00.000Z',
                  qrRotationSeconds: 30,
                  status: 'open',
                },
              ],
            },
          },
        });
      return Promise.resolve({ data: { data: {} } });
    });

    renderPage(<LecturerWorkspacePage />);

    const closed = await screen.findByRole('row', { name: /CSC 405.*closed.*0/i });
    const open = screen.getByRole('row', { name: /CSC 407.*open.*12/i });
    const closedCells = within(closed).getAllByRole('cell');
    const openCells = within(open).getAllByRole('cell');

    expect(within(closed).getByText('closed')).toHaveClass('text-red-700', 'dark:text-red-300');
    expect(within(open).getByText('open')).toHaveClass('text-emerald-700', 'dark:text-emerald-300');
    expect(closed).toHaveClass('border-l-rose-600', 'dark:bg-rose-950/30');
    expect(open).toHaveClass('border-l-emerald-600', 'dark:bg-emerald-950/30');
    expect(closedCells[0]).toHaveClass('text-blue-700', 'dark:text-blue-300');
    expect(closedCells[1]).toHaveClass('text-teal-700', 'dark:text-teal-300');
    expect(closedCells[3]).toHaveClass('text-amber-700', 'dark:text-amber-300');
    expect(openCells[3]).toHaveClass('text-emerald-700', 'dark:text-emerald-300');
  });
});
