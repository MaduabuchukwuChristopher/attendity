import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcademicManagementPage from '../src/features/academic/academic-management-page.js';
import { useAuthStore } from '../src/store/auth-store.js';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../src/api/client.js', () => ({
  apiClient: { get: apiGet, patch: vi.fn(), post: vi.fn() },
}));

vi.mock('../src/layouts/dashboard-layout.js', () => ({
  DashboardLayout: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
}));

function renderCourses() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AcademicManagementPage type="courses" />
    </QueryClientProvider>,
  );
}

describe('academic course presentation', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockImplementation(async (url: string) => {
      if (url === '/academic/courses')
        return {
          data: {
            data: [
              {
                _id: 'course-1',
                attendanceRequirement: 68,
                code: 'CSC 401',
                creditUnits: 3,
                lecturerId: {
                  _id: 'lecturer-1',
                  email: 'lecturer@attendity.test',
                  firstName: 'Maya',
                  lastName: 'Mensah',
                },
                title: 'Systems Analysis',
              },
            ],
          },
        };
      if (url === '/academic/departments') return { data: { data: [] } };
      if (url === '/users')
        return {
          data: {
            data: [
              {
                _id: 'lecturer-1',
                accountStatus: 'active',
                email: 'lecturer@attendity.test',
                firstName: 'Maya',
                lastName: 'Mensah',
                role: 'lecturer',
              },
            ],
          },
        };
      throw new Error(`Unexpected GET ${url}`);
    });
  });

  it('uses coloured identifiers, semantic percentages, and row accents for lecturers', async () => {
    useAuthStore.getState().setSession(
      {
        email: 'lecturer@attendity.test',
        fullName: 'Maya Mensah',
        id: 'lecturer-1',
        role: 'lecturer',
        universityId: 'university-1',
      },
      'test-token',
    );
    renderCourses();

    const row = await screen.findByRole('row', {
      name: /CSC 401 Systems Analysis 3 68% Maya Mensah/,
    });
    expect(within(row).getByText('CSC 401')).toHaveClass('bg-blue-100', 'dark:bg-blue-950');
    expect(within(row).getByText('Systems Analysis').closest('td')).toHaveClass(
      'text-blue-900',
      'dark:text-blue-200',
    );
    expect(within(row).getByText('3')).toHaveClass('bg-slate-100', 'dark:bg-slate-800');
    expect(within(row).getByText('68%')).toHaveClass('text-amber-700', 'dark:text-amber-300');
    expect(row).toHaveClass('border-l-4', 'border-l-blue-600');
    expect(screen.getByRole('heading', { name: 'Courses' }).parentElement).toContainElement(
      document.querySelector('.lucide-book-open-check'),
    );
  });

  it('keeps lecturer assignment controls readable in dark mode for administrators', async () => {
    useAuthStore.getState().setSession(
      {
        email: 'admin@attendity.test',
        fullName: 'Institution Admin',
        id: 'admin-1',
        role: 'university_admin',
        universityId: 'university-1',
      },
      'test-token',
    );
    renderCourses();

    expect(await screen.findByLabelText('Lecturer for CSC 401')).toHaveClass(
      'dark:bg-dark-surface',
      'dark:text-slate-100',
      'dark:border-slate-700',
    );
  });
});
