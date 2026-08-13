import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ClassSchedulesPage from '../src/features/academic/class-schedules-page.js';
import RegistrationManagementPage from '../src/features/registrations/registration-management-page.js';
import { useAuthStore } from '../src/store/auth-store.js';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../src/api/client.js', () => ({
  apiClient: { get: apiGet, patch: vi.fn(), post: vi.fn() },
}));

vi.mock('../src/layouts/dashboard-layout.js', () => ({
  DashboardLayout: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
}));

function renderPage(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

describe('dashboard destructive action treatments', () => {
  beforeEach(() => {
    apiGet.mockReset();
    useAuthStore.getState().setSession(
      {
        email: 'admin@attendity.test',
        fullName: 'Attendity Admin',
        id: 'admin-1',
        role: 'university_admin',
        universityId: 'university-1',
      },
      'test-token',
    );
  });

  it('presents scheduled-class cancellation as a danger action', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url.startsWith('/academic/schedules'))
        return Promise.resolve({
          data: {
            data: {
              items: [
                {
                  courseCode: 'CSC 401',
                  courseTitle: 'Systems Analysis',
                  endsAt: '2026-08-12T12:00:00.000Z',
                  id: 'schedule-1',
                  lecturerName: 'Dr Ada Okafor',
                  startsAt: '2026-08-12T10:00:00.000Z',
                  status: 'scheduled',
                  venue: 'Lecture Hall A',
                },
              ],
            },
          },
        });
      if (url === '/academic/courses') return Promise.resolve({ data: { data: [] } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    renderPage(<ClassSchedulesPage />);

    expect(await screen.findByRole('button', { name: 'Cancel' })).toHaveClass(
      'bg-danger',
      'text-white',
    );
  });

  it('presents registration withdrawal as a colored danger action', async () => {
    apiGet.mockResolvedValue({
      data: {
        data: [
          {
            _id: 'registration-1',
            courseId: { code: 'CSC 401', title: 'Systems Analysis' },
            registrationNumber: 'ATD/CSC/2026/001',
            source: 'core',
            status: 'approved',
            studentId: {
              email: 'student@attendity.test',
              firstName: 'Amina',
              lastName: 'Cole',
            },
          },
        ],
      },
    });

    renderPage(<RegistrationManagementPage />);

    expect(await screen.findByRole('button', { name: 'Withdraw' })).toHaveClass(
      'bg-danger',
      'text-white',
    );
  });

  it('assigns semantic colors to event export and print actions', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/events/events-page.tsx'),
      'utf8',
    );

    expect(source).toMatch(/onClick=\{\(\) => downloadHistory\(records\)\}[\s\S]*?variant="csv"/);
    expect(source).toContain('onClick={() => window.print()} variant="print"');
    expect(source).toMatch(/format === 'csv' \? 'csv' : format === 'xlsx' \? 'excel' : 'download'/);
  });
});
