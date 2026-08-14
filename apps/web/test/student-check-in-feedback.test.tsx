import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentWorkspacePage from '../src/features/portals/student-workspace-page.js';
import { useAuthStore } from '../src/store/auth-store.js';

const { apiGet, apiPost } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

let scanSuccess: ((value: string) => void) | undefined;

vi.mock('../src/api/client.js', () => ({
  apiClient: { get: apiGet, post: apiPost },
}));

vi.mock('../src/layouts/dashboard-layout.js', () => ({
  DashboardLayout: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanType: { SCAN_TYPE_CAMERA: 0 },
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
  Html5QrcodeScanner: class {
    render(success: (value: string) => void) {
      scanSuccess = success;
    }

    clear = () => Promise.resolve();
  },
}));

const workspace = {
  courses: [],
  faceProfile: { configured: false, enrolled: false },
  heatmap: {},
  registrationNumber: 'ATT/2026/001',
  timeline: [],
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <StudentWorkspacePage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe('student check-in feedback', () => {
  beforeEach(() => {
    scanSuccess = undefined;
    apiGet.mockReset();
    apiPost.mockReset();
    apiGet.mockImplementation((url: string) =>
      Promise.resolve({ data: { data: url === '/attendance/student' ? workspace : [] } }),
    );
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
  });

  it('keeps a manual verification failure inside the manual-entry card', async () => {
    apiPost.mockRejectedValueOnce({
      response: { data: { message: 'The attendance code could not be verified.' } },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('Manual check-in code'), {
      target: { value: 'INVALID12' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and check in' }));

    const manualCard = screen.getByRole('region', { name: 'Manual check-in card' });
    expect(await within(manualCard).findByRole('alert')).toHaveTextContent(
      'The attendance code could not be verified.',
    );
    expect(
      within(screen.getByRole('region', { name: 'Scan the live QR scanner' })).queryByRole('alert'),
    ).not.toBeInTheDocument();
  });

  it('shows a scanned success in the scanner card and opens a verified notification', async () => {
    apiPost.mockImplementation((url: string) => {
      if (url === '/attendance/check-in/requirements')
        return Promise.resolve({
          data: {
            data: {
              closesAt: '2099-08-10T13:00:00.000Z',
              faceProfileEnrolled: false,
              faceVerificationRequired: false,
              gpsRequired: false,
            },
          },
        });
      return Promise.resolve({ data: { data: { recorded: true } } });
    });
    const { client } = renderPage();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    fireEvent.click(screen.getByRole('button', { name: 'Open scanner' }));
    await waitFor(() => expect(scanSuccess).toBeDefined());
    act(() => scanSuccess?.('v1.encrypted-attendance-token'));

    const scannerCard = screen.getByRole('region', { name: 'Scan the live QR scanner' });
    expect(await within(scannerCard).findByRole('status')).toHaveTextContent(
      'Attendance recorded successfully.',
    );
    expect(screen.getByRole('status', { name: 'Attendance verified' })).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['attendance', 'student'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['analytics'] });
  });
});
