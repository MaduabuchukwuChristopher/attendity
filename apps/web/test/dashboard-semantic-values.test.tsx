import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AnalyticsOverview } from '@qr/types';
import { DashboardAnalyticsContent } from '../src/features/analytics/dashboard-analytics-overview.js';
import { ExaminerVerificationOverview } from '../src/features/analytics/examiner-verification-overview.js';

const zeroRiskAnalytics: AnalyticsOverview = {
  period: {
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-10T23:59:59.999Z',
    days: 10,
    preset: 'monthly',
  },
  kpis: {
    totalSessions: 12,
    totalCheckIns: 320,
    averageAttendance: 82,
    activeSessions: 0,
    registeredStudents: 40,
  },
  trend: [{ date: '2026-08-03', sessions: 2, checkIns: 32, attendanceRate: 80 }],
  courses: [
    {
      id: 'course-1',
      code: 'CSC 401',
      title: 'Systems Analysis',
      department: 'Computer Science',
      sessions: 2,
      registrations: 40,
      checkIns: 64,
      attendanceRate: 80,
    },
  ],
  departments: [],
  leaderboard: [],
  insights: [],
  risks: [],
  liveFeed: [],
  generatedAt: '2026-08-10T12:00:00.000Z',
};

describe('dashboard semantic values', () => {
  it('treats zero risk as a healthy value and gives analytics cards icon headings', () => {
    render(
      <DashboardAnalyticsContent
        analytics={zeroRiskAnalytics}
        heading="Institution attendance pulse"
      />,
    );

    expect(screen.getByText('0')).toHaveClass('text-emerald-800', 'dark:text-emerald-200');

    for (const heading of ['Daily attendance trend', 'Risk distribution', 'Attendance by course']) {
      expect(screen.getByRole('heading', { name: heading })).toBeVisible();
    }
    expect(screen.getAllByTestId('card-header-icon')).toHaveLength(3);
  });

  it('treats zero rejected verifications as healthy rather than warning', () => {
    render(
      <ExaminerVerificationOverview
        history={[
          {
            reportId: 'ACL-001',
            status: 'valid',
            verificationTime: '2026-08-10T12:00:00.000Z',
            verified: true,
          },
        ]}
      />,
    );

    const metric = screen.getByLabelText('Rejected: 0');
    expect(within(metric).getByText('0')).toHaveClass('text-emerald-800', 'dark:text-emerald-200');
  });
});
