import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExaminerWorkspacePage from '../src/features/portals/examiner-workspace-page.js';
import { useAuthStore } from '../src/store/auth-store.js';

const { apiGet, clearScanner } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  clearScanner: vi.fn(() => Promise.resolve()),
}));
let scanSuccess: ((value: string) => void) | undefined;

vi.mock('../src/api/client.js', () => ({
  apiClient: { get: apiGet },
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

    clear = clearScanner;
  },
}));

const verifiedResult = {
  verified: true,
  verificationTime: '2026-08-12T14:00:00.000Z',
  reportId: 'ACL-20260812-A1B2C3D4E5',
  status: 'valid' as const,
  student: { name: 'Chidi Nwankwo', matricNumber: 'ATD/CSC/2026/001' },
  course: { code: 'CSC 405', title: 'Computer Science: Research and Innovation' },
  attendancePercentage: 100,
  requiredPercentage: 75,
  eligibility: 'eligible' as const,
  issueDate: '2026-08-12T13:59:00.000Z',
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ExaminerWorkspacePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openAndScan() {
  fireEvent.click(screen.getByRole('button', { name: 'Open scanner' }));
  await waitFor(() => expect(scanSuccess).toBeDefined());
  act(() => scanSuccess?.('http://localhost:5173/verify/clearance/reference-123'));
  return screen.getByRole('region', { name: 'Continuous clearance scanner scanner' });
}

describe('examiner scanner feedback', () => {
  beforeEach(() => {
    scanSuccess = undefined;
    apiGet.mockReset();
    clearScanner.mockClear();
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
  });

  afterEach(() => vi.useRealTimers());

  it('keeps pending and verified results inside the scanner card', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    apiGet.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderPage();

    const scanner = await openAndScan();
    expect(
      await within(scanner).findByText('QR detected. Checking the live report…'),
    ).toHaveAttribute('role', 'status');
    await act(async () => {
      resolveRequest?.({ data: { data: [verifiedResult] } });
    });
    expect(
      await within(scanner).findByText('Clearance verified — ACL-20260812-A1B2C3D4E5'),
    ).toHaveAttribute('role', 'status');
    expect(within(scanner).getByRole('button', { name: 'Open scanner' })).toBeVisible();
    expect(clearScanner).toHaveBeenCalled();
    expect(screen.getByRole('status', { name: 'Clearance verified' })).toHaveTextContent(
      'ACL-20260812-A1B2C3D4E5',
    );
  });

  it('shows a rejected integrity result inside the scanner card', async () => {
    apiGet.mockResolvedValueOnce({
      data: {
        data: [
          {
            ...verifiedResult,
            verified: false,
            status: 'tampered',
            warning: 'The stored report failed its digital integrity check.',
          },
        ],
      },
    });
    renderPage();

    const scanner = await openAndScan();
    expect(await within(scanner).findByRole('alert')).toHaveTextContent(
      'Clearance rejected — The stored report failed its digital integrity check.',
    );
    expect(within(scanner).getByRole('button', { name: 'Open scanner' })).toBeVisible();
    const notification = screen.getByRole('alert', { name: 'Clearance rejected' });
    expect(notification).toHaveTextContent('The stored report failed its digital integrity check.');
    fireEvent.click(
      within(notification).getByRole('button', { name: 'Dismiss verification notification' }),
    );
    expect(screen.queryByRole('alert', { name: 'Clearance rejected' })).not.toBeInTheDocument();
  });

  it('shows the sanitized API error inside the scanner card', async () => {
    apiGet.mockRejectedValueOnce({
      response: { data: { message: 'The verification service is temporarily unavailable.' } },
    });
    renderPage();

    const scanner = await openAndScan();
    expect(await within(scanner).findByRole('alert')).toHaveTextContent(
      'The verification service is temporarily unavailable.',
    );
    expect(within(scanner).getByRole('button', { name: 'Open scanner' })).toBeVisible();
    expect(screen.getByRole('alert', { name: 'Verification failed' })).toHaveTextContent(
      'The verification service is temporarily unavailable.',
    );
  });

  it('automatically dismisses a completed verification notification after five seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiGet.mockResolvedValueOnce({ data: { data: [verifiedResult] } });
    renderPage();

    await openAndScan();
    expect(await screen.findByRole('status', { name: 'Clearance verified' })).toBeVisible();
    await act(async () => vi.advanceTimersByTime(5_000));
    expect(screen.queryByRole('status', { name: 'Clearance verified' })).not.toBeInTheDocument();
  });
});
