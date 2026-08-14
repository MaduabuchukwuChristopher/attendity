import type { AnalyticsReport } from '@qr/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsPage from '../src/features/reports/reports-page.js';
import { useAuthStore } from '../src/store/auth-store.js';

const analytics = vi.hoisted(() => ({ overview: vi.fn(), report: vi.fn() }));

vi.mock('../src/features/analytics/use-analytics.js', () => ({
  useAnalyticsOverview: analytics.overview,
  useAnalyticsReport: analytics.report,
}));

vi.mock('../src/layouts/dashboard-layout.js', () => ({
  DashboardLayout: ({ children }: { readonly children: React.ReactNode }) => <>{children}</>,
}));

const report: AnalyticsReport = {
  reportId: 'ATR-20260812-DEMO',
  title: 'Course Attendance Report',
  scope: 'course',
  generatedAt: '2026-08-12T12:00:00.000Z',
  generatedBy: 'Lecturer User',
  branding: { universityName: 'Attendity University', displayName: 'Attendity University' },
  verification: {
    source: 'live-attendance-data',
    checksum: 'a'.repeat(64),
    verifiedAt: '2026-08-12T12:00:00.000Z',
  },
  filters: {
    courseId: '507f1f77bcf86cd799439011',
    from: '2026-08-10',
    to: '2026-08-12',
  },
  summary: {
    totalSessions: 2,
    totalCheckIns: 1,
    averageAttendance: 50,
    activeSessions: 0,
    registeredStudents: 1,
  },
  rows: [
    {
      id: 'student:course',
      studentName: 'Ada Okafor',
      registrationNumber: 'ATD/CSC/001',
      courseCode: 'CSC 401',
      courseTitle: 'Systems Analysis',
      sessionsHeld: 2,
      sessionsAttended: 1,
      attendanceRate: 50,
      requiredAttendance: 75,
      riskLevel: 'high',
      latestAttendanceAt: '2026-08-12T09:05:00.000Z',
    },
  ],
  pagination: { page: 1, limit: 25, total: 1, pages: 1 },
};

describe('attendance report filters', () => {
  beforeEach(() => {
    analytics.overview.mockReturnValue({
      data: {
        courses: [{ id: '507f1f77bcf86cd799439011', code: 'CSC 401', title: 'Systems Analysis' }],
      },
    });
    analytics.report.mockReturnValue({ data: report, isError: false, isLoading: false });
    useAuthStore.getState().setSession(
      {
        email: 'lecturer@attendity.test',
        fullName: 'Lecturer User',
        id: 'lecturer-1',
        role: 'lecturer',
        universityId: 'university-1',
      },
      'test-token',
    );
  });

  it('displays latest attendance and submits the selected course date range', () => {
    render(<ReportsPage />);

    expect(screen.getByRole('columnheader', { name: 'Latest attendance' })).toBeVisible();
    expect(screen.getByText(/12 Aug 2026/)).toBeVisible();

    fireEvent.change(screen.getByLabelText('Report type'), { target: { value: 'course' } });
    fireEvent.change(screen.getByLabelText('Course for course report'), {
      target: { value: '507f1f77bcf86cd799439011' },
    });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-08-10' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-08-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate live report' }));

    expect(analytics.report).toHaveBeenLastCalledWith(
      {
        courseId: '507f1f77bcf86cd799439011',
        from: '2026-08-10',
        limit: 25,
        page: 1,
        scope: 'course',
        to: '2026-08-12',
      },
      true,
    );
  });
});
