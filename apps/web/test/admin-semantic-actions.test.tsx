import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CurriculumManagementPage from '../src/features/academic/curriculum-management-page.js';

const { apiDelete, apiGet, apiPatch } = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
}));

vi.mock('../src/api/client.js', () => ({
  apiClient: {
    delete: apiDelete,
    get: apiGet,
    patch: apiPatch,
    post: vi.fn(),
  },
}));

vi.mock('../src/layouts/dashboard-layout.js', () => ({
  DashboardLayout: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CurriculumManagementPage />
    </QueryClientProvider>,
  );
}

describe('administrator semantic actions', () => {
  beforeEach(() => {
    apiDelete.mockReset();
    apiGet.mockReset();
    apiPatch.mockReset();
    apiDelete.mockResolvedValue({ data: { data: {} } });
    apiPatch.mockResolvedValue({ data: { data: {} } });
    apiGet.mockImplementation((url: string) => {
      if (url === '/academic/curriculum')
        return Promise.resolve({
          data: {
            data: [
              {
                _id: 'mapping-1',
                classification: 'core',
                courseId: { code: 'CSC 401', title: 'Systems Analysis' },
                createdAt: '2026-08-01T10:00:00.000Z',
                levelId: { name: '400 Level' },
                programmeId: { name: 'Computer Science' },
                status: 'active',
                termId: { name: 'First Semester' },
              },
            ],
          },
        });
      if (url === '/academic/lecturer-assignments')
        return Promise.resolve({
          data: {
            data: [
              {
                _id: 'assignment-1',
                academicSessionId: { name: '2026/2027' },
                assignmentRole: 'primary',
                courseId: { code: 'CSC 401', title: 'Systems Analysis' },
                endsAt: '2027-01-30T10:00:00.000Z',
                lecturerId: { firstName: 'Maya', lastName: 'Mensah' },
                startsAt: '2026-09-01T10:00:00.000Z',
                status: 'active',
                termId: { name: 'First Semester' },
              },
            ],
          },
        });
      if (url === '/academic/structure')
        return Promise.resolve({ data: { data: { items: [], pagination: {} } } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders active deactivation actions as explicit danger buttons', async () => {
    renderPage();

    const actions = await screen.findAllByRole('button', { name: 'Deactivate' });
    expect(actions).toHaveLength(2);
    for (const action of actions) {
      expect(action).toHaveClass('bg-danger', 'text-white', 'gap-2');
      expect(action.firstElementChild).toHaveClass('lucide-power');
    }

    fireEvent.click(actions[0]!);
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/academic/curriculum/mapping-1'));
  });

  it('uses complementary semantic tones throughout lecturer assignment columns', async () => {
    renderPage();

    const row = await screen.findByRole('row', {
      name: /Maya Mensah.*CSC 401.*First Semester.*primary.*active/i,
    });
    const cells = within(row).getAllByRole('cell');

    expect(cells[0]).toHaveClass('text-blue-900', 'dark:text-blue-200');
    expect(cells[1]).toHaveClass('text-blue-700', 'dark:text-blue-300');
    expect(cells[2]).toHaveClass('text-teal-700', 'dark:text-teal-300');
    expect(cells[3]).toHaveClass('text-violet-700', 'dark:text-violet-300');
  });
});
