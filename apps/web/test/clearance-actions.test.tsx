import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClearancePage from '../src/features/clearance/clearance-page.js';
import { printClearance } from '../src/features/clearance/use-clearance.js';
import { useAuthStore } from '../src/store/auth-store.js';

const { apiGet, apiPost } = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

vi.mock('../src/api/client.js', () => ({
  apiClient: { get: apiGet, post: apiPost },
}));

vi.mock('../src/layouts/dashboard-layout.js', () => ({
  DashboardLayout: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
}));

function renderClearance() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ClearancePage />
    </QueryClientProvider>,
  );
}

describe('clearance document actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiGet.mockReset();
    apiPost.mockReset();
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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clearance-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('generates clearance first and then offers explicit download and print actions', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url === '/clearance/eligibility')
        return Promise.resolve({
          data: {
            data: [
              {
                absent: 2,
                attendancePercentage: 82,
                courseCode: 'CSC 401',
                courseId: 'course-1',
                courseTitle: 'Systems Analysis',
                currentStreak: 4,
                decision: 'eligible',
                present: 9,
                registrationId: 'registration-1',
                requiredPercentage: 75,
              },
            ],
          },
        });
      if (url === '/clearance/reports') return Promise.resolve({ data: { data: { items: [] } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiPost.mockResolvedValue({ data: { data: { reportId: 'ACL-2026-001' } } });
    renderClearance();

    fireEvent.click(await screen.findByRole('button', { name: 'Generate approved clearance' }));

    expect(
      await screen.findByRole('button', { name: 'Download generated clearance PDF' }),
    ).toHaveClass('bg-blue-600');
    expect(screen.getByRole('button', { name: 'Print generated clearance PDF' })).toHaveClass(
      'bg-violet-600',
    );
    expect(apiGet).not.toHaveBeenCalledWith('/clearance/reports/ACL-2026-001/pdf', {
      responseType: 'blob',
    });
  });

  it('keeps a generation error inside only the course card that initiated it', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url === '/clearance/eligibility')
        return Promise.resolve({
          data: {
            data: [
              {
                absent: 2,
                attendancePercentage: 82,
                courseCode: 'CSC 401',
                courseId: 'course-1',
                courseTitle: 'Systems Analysis',
                currentStreak: 4,
                decision: 'eligible',
                present: 9,
                registrationId: 'registration-1',
                requiredPercentage: 75,
              },
              {
                absent: 1,
                attendancePercentage: 91,
                courseCode: 'CSC 405',
                courseId: 'course-2',
                courseTitle: 'Software Engineering',
                currentStreak: 6,
                decision: 'eligible',
                present: 10,
                registrationId: 'registration-2',
                requiredPercentage: 75,
              },
            ],
          },
        });
      if (url === '/clearance/reports') return Promise.resolve({ data: { data: { items: [] } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiPost.mockRejectedValue({
      response: { data: { message: 'Clearance generation requires an active database primary.' } },
    });
    renderClearance();

    const cards = await screen.findAllByTestId('clearance-course-card');
    fireEvent.click(within(cards[0]!).getByRole('button', { name: 'Generate approved clearance' }));

    expect(
      await within(cards[0]!).findByText(
        'Clearance generation requires an active database primary.',
      ),
    ).toBeVisible();
    expect(
      within(cards[1]!).queryByText('Clearance generation requires an active database primary.'),
    ).not.toBeInTheDocument();
  });

  it('keeps neighboring not-eligible course cards independent when CSC 405 expands', async () => {
    const courses = [
      {
        absent: 5,
        attendancePercentage: 58,
        courseCode: 'CSC 401',
        courseId: 'course-1',
        courseTitle: 'Systems Analysis',
        currentStreak: 1,
        decision: 'not_eligible',
        present: 7,
        registrationId: 'registration-1',
        requiredPercentage: 75,
      },
      {
        absent: 4,
        attendancePercentage: 64,
        courseCode: 'CSC 403',
        courseId: 'course-2',
        courseTitle: 'Operating Systems',
        currentStreak: 2,
        decision: 'not_eligible',
        present: 8,
        registrationId: 'registration-2',
        requiredPercentage: 75,
      },
      {
        absent: 1,
        attendancePercentage: 91,
        courseCode: 'CSC 405',
        courseId: 'course-3',
        courseTitle: 'Software Engineering',
        currentStreak: 6,
        decision: 'eligible',
        present: 10,
        registrationId: 'registration-3',
        requiredPercentage: 75,
      },
    ];
    apiGet.mockImplementation((url: string) => {
      if (url === '/clearance/eligibility') return Promise.resolve({ data: { data: courses } });
      if (url === '/clearance/reports') return Promise.resolve({ data: { data: { items: [] } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiPost.mockResolvedValue({ data: { data: { reportId: 'ACL-2026-405' } } });
    renderClearance();

    const cards = await screen.findAllByTestId('clearance-course-card');
    expect(cards[0]?.parentElement).toHaveClass('items-start');
    cards.forEach((card) => expect(card).toHaveClass('self-start'));

    fireEvent.click(within(cards[2]!).getByRole('button', { name: 'Generate approved clearance' }));

    expect(
      await within(cards[2]!).findByRole('button', {
        name: 'Download generated clearance PDF',
      }),
    ).toBeVisible();
    expect(cards[0]).toHaveClass('self-start');
    expect(cards[1]).toHaveClass('self-start');
  });

  it('styles the eligibility decision as a prominent status control', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url === '/clearance/eligibility')
        return Promise.resolve({
          data: {
            data: [
              {
                absent: 2,
                attendancePercentage: 62,
                courseCode: 'MTH 405',
                courseId: 'course-2',
                courseTitle: 'Numerical Analysis',
                currentStreak: 1,
                decision: 'not_eligible',
                present: 4,
                registrationId: 'registration-2',
                requiredPercentage: 75,
              },
            ],
          },
        });
      if (url === '/clearance/reports') return Promise.resolve({ data: { data: { items: [] } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    renderClearance();

    expect(await screen.findByText('Not eligible')).toHaveClass(
      '!rounded-lg',
      'px-3',
      'py-1.5',
      'shadow-sm',
    );
  });

  it('uses distinct semantic colors for every archived report action', async () => {
    apiGet.mockImplementation((url: string) => {
      if (url === '/clearance/eligibility') return Promise.resolve({ data: { data: [] } });
      if (url === '/clearance/reports')
        return Promise.resolve({
          data: {
            data: {
              items: [
                {
                  attendancePercentage: 91,
                  checksum: 'abcdef1234567890',
                  courseCode: 'CSC 405',
                  courseTitle: 'Software Engineering',
                  downloadCount: 0,
                  id: 'report-1',
                  issuedAt: '2026-08-12T08:00:00.000Z',
                  printCount: 0,
                  reportId: 'ACL-2026-405',
                  status: 'valid',
                  version: 1,
                },
              ],
            },
          },
        });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    renderClearance();

    expect(await screen.findByRole('button', { name: /as PDF/ })).toHaveClass('bg-blue-600');
    expect(screen.getByRole('button', { name: /as Excel/ })).toHaveClass('bg-emerald-600');
    expect(screen.getByRole('button', { name: /as CSV/ })).toHaveClass('bg-amber-400');
    expect(screen.getByRole('button', { name: /Share .* verification link/ })).toHaveClass(
      'bg-cyan-400',
    );
    expect(screen.getByRole('button', { name: /^Print ACL/ })).toHaveClass('bg-violet-600');
  });

  it('reserves the print tab before awaiting the authenticated PDF', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    const pending = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    apiGet.mockReturnValue(pending);
    const reservedWindow = {
      close: vi.fn(),
      location: { href: 'about:blank' },
      opener: window,
    };
    const open = vi.spyOn(window, 'open').mockReturnValue(reservedWindow as unknown as Window);

    const printing = printClearance('ACL-2026-001');
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    resolveRequest?.({ data: new Blob(['print-pdf'], { type: 'application/pdf' }) });
    await printing;

    expect(reservedWindow.opener).toBeNull();
    expect(reservedWindow.location.href).toBe('blob:clearance-pdf');
  });
});
