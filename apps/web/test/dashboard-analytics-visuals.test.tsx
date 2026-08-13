import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AnalyticsOverview } from '@qr/types';
import {
  ComparisonBarChart,
  DataTable,
  DonutChart,
  MetricCard,
  ProgressMeter,
  TrendChart,
} from '@qr/ui';
import { DashboardAnalyticsContent } from '../src/features/analytics/dashboard-analytics-overview.js';
import { StudentAnalyticsPanel } from '../src/features/analytics/student-analytics-panel.js';
import { ExaminerVerificationOverview } from '../src/features/analytics/examiner-verification-overview.js';

const analyticsFixture: AnalyticsOverview = {
  period: {
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-10T23:59:59.999Z',
    days: 10,
    preset: 'monthly',
  },
  kpis: {
    totalSessions: 24,
    totalCheckIns: 707,
    averageAttendance: 73,
    activeSessions: 1,
    registeredStudents: 246,
  },
  trend: [
    { date: '2026-08-03', sessions: 4, checkIns: 91, attendanceRate: 67 },
    { date: '2026-08-04', sessions: 4, checkIns: 101, attendanceRate: 75 },
  ],
  courses: [
    {
      id: 'course-1',
      code: 'CSC 401',
      title: 'Systems Analysis',
      department: 'Computer Science',
      sessions: 4,
      registrations: 40,
      checkIns: 128,
      attendanceRate: 80,
    },
  ],
  departments: [],
  leaderboard: [],
  insights: [],
  risks: [
    {
      id: 'risk-1',
      studentId: 'student-1',
      studentName: 'Amina Cole',
      registrationNumber: 'ATD/CSC/2026/001',
      courseId: 'course-1',
      courseCode: 'CSC 401',
      courseTitle: 'Systems Analysis',
      currentAttendance: 54,
      projectedAttendance: 58,
      requiredAttendance: 75,
      sessionsHeld: 4,
      sessionsAttended: 2,
      level: 'high',
      confidence: 84,
      reason: 'Attendance is below the course requirement.',
      recommendation: 'Attend the next scheduled class.',
    },
  ],
  liveFeed: [],
  generatedAt: '2026-08-10T12:00:00.000Z',
};

describe('dashboard analytics visuals', () => {
  it('gives every responsive chart a guaranteed visible height', () => {
    render(
      <>
        <TrendChart
          data={[{ label: 'Mon', value: 72 }]}
          label="Weekly attendance trend"
          valueLabel="Attendance"
        />
        <ComparisonBarChart
          data={[{ label: 'CSC 401', value: 81 }]}
          label="Course attendance comparison"
        />
        <DonutChart data={[{ label: 'Verified', value: 8 }]} label="Verification distribution" />
      </>,
    );

    for (const label of [
      'Weekly attendance trend',
      'Course attendance comparison',
      'Verification distribution',
    ]) {
      expect(screen.getByRole('figure', { name: label })).toHaveStyle({ height: '18rem' });
    }
  });

  it('presents metrics with labelled colour treatments and supporting context', () => {
    render(
      <MetricCard
        label="Average attendance"
        supportingText="Across all verified sessions"
        tone="green"
        value="78%"
      />,
    );

    const metric = screen.getByLabelText('Average attendance: 78%');
    expect(metric).toHaveClass('from-emerald-100', 'dark:from-emerald-950');
    expect(screen.getByText('Across all verified sessions')).toBeVisible();
  });

  it('keeps percentage graphics readable without relying on colour alone', () => {
    render(<ProgressMeter label="CSC 401 attendance" value={74} />);

    const meter = screen.getByRole('progressbar', { name: 'CSC 401 attendance' });
    expect(meter).toHaveAttribute('aria-valuenow', '74');
    expect(screen.getByText('74%')).toBeVisible();
  });

  it('gives data lists a strong header and alternating interactive rows', () => {
    render(
      <DataTable
        caption="Attendance list"
        columns={[{ id: 'student', header: 'Student', cell: (row) => row.name }]}
        rows={[{ id: 'student-1', name: 'Amina Cole' }]}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Student' })).toHaveClass('text-white');
    expect(screen.getByRole('row', { name: 'Amina Cole' })).toHaveClass(
      'bg-emerald-50/80',
      'dark:bg-slate-900',
      'hover:brightness-[0.98]',
    );
  });

  it('shows a complete live analytics overview on an administrator dashboard', () => {
    render(
      <DashboardAnalyticsContent
        analytics={analyticsFixture}
        heading="Institution attendance pulse"
      />,
    );

    expect(screen.getByLabelText('Verified check-ins: 707')).toBeVisible();
    expect(screen.getByLabelText('Average attendance: 73%')).toBeVisible();
    expect(screen.getByRole('figure', { name: 'Institution attendance trend' })).toBeVisible();
    expect(screen.getByRole('figure', { name: 'Institution risk distribution' })).toBeVisible();
    expect(screen.getByRole('figure', { name: 'Institution course comparison' })).toBeVisible();
  });

  it('labels lecturer graphics as course-scoped insight', () => {
    render(
      <DashboardAnalyticsContent
        analytics={analyticsFixture}
        heading="Lecturer attendance pulse"
        scopeName="Lecturer"
      />,
    );

    expect(screen.getByRole('figure', { name: 'Lecturer attendance trend' })).toBeVisible();
    expect(screen.getByRole('figure', { name: 'Lecturer risk distribution' })).toBeVisible();
  });

  it('turns a student course record into personal graphical insight', () => {
    render(
      <StudentAnalyticsPanel
        courses={[
          {
            id: 'course-1',
            code: 'CSC 401',
            title: 'Systems Analysis',
            attendanceRequirement: 75,
            sessionsHeld: 4,
            sessionsAttended: 3,
            attendancePercentage: 75,
            eligible: true,
          },
          {
            id: 'course-2',
            code: 'MTH 405',
            title: 'Numerical Analysis',
            attendanceRequirement: 75,
            sessionsHeld: 4,
            sessionsAttended: 2,
            attendancePercentage: 50,
            eligible: false,
          },
        ]}
      />,
    );

    expect(screen.getByLabelText('Average attendance: 63%')).toBeVisible();
    expect(screen.getByLabelText('Courses eligible: 1/2')).toBeVisible();
    expect(
      screen.getByRole('figure', { name: 'Personal course attendance comparison' }),
    ).toBeVisible();
  });

  it('keeps examiner analytics honest until live checks exist', () => {
    const { rerender } = render(<ExaminerVerificationOverview history={[]} />);

    expect(screen.getByText('Analytics begin with your first live verification.')).toBeVisible();
    expect(screen.queryByRole('figure', { name: 'Examiner verification distribution' })).toBeNull();

    rerender(
      <ExaminerVerificationOverview
        history={[
          {
            reportId: 'ACL-001',
            status: 'valid',
            verificationTime: '2026-08-10T12:00:00.000Z',
            verified: true,
          },
          {
            reportId: 'ACL-002',
            status: 'not_found',
            verificationTime: '2026-08-10T12:02:00.000Z',
            verified: false,
          },
        ]}
      />,
    );

    expect(screen.getByLabelText('Verified: 1')).toBeVisible();
    expect(screen.getByLabelText('Rejected: 1')).toBeVisible();
    expect(
      screen.getByRole('figure', { name: 'Examiner verification distribution' }),
    ).toBeVisible();
  });
});
