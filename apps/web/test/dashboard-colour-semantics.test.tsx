import { DataTable, IdentifierBadge, MetricCard, PercentageValue, ProgressMeter } from '@qr/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DashboardTopbar } from '../src/layouts/dashboard-topbar.js';

describe('dashboard colour semantics', () => {
  it('colours a metric value with the selected card tone', () => {
    render(<MetricCard label="Verified check-ins" tone="blue" value={77} />);

    expect(screen.getByText('77')).toHaveClass('text-blue-800', 'dark:text-blue-200');
  });

  it.each([
    { expectedClass: 'text-rose-700', value: 42 },
    { expectedClass: 'text-amber-700', value: 68 },
    { expectedClass: 'text-emerald-700', value: 82 },
  ])('colours $value percent according to its attendance level', ({ expectedClass, value }) => {
    render(<ProgressMeter label={`${value}% attendance`} value={value} />);

    expect(screen.getByText(`${value}%`)).toHaveClass(expectedClass);
  });

  it('gives every data row a visible dark-mode-safe accent border', () => {
    render(
      <DataTable
        caption="Courses"
        columns={[{ id: 'course', header: 'Course', cell: (row) => row.code }]}
        rows={[{ code: 'CSC 401', id: 'course-1' }]}
      />,
    );

    expect(screen.getByRole('row', { name: 'CSC 401' })).toHaveClass(
      'border-l-4',
      'border-l-slate-300',
      'dark:border-l-slate-600',
    );
  });

  it('applies fixed and row-derived semantic tones to table cells', () => {
    render(
      <DataTable
        caption="Semantic course values"
        columns={[
          { id: 'course', header: 'Course', cell: (row) => row.code, tone: 'blue' },
          {
            id: 'checkIns',
            header: 'Check-ins',
            cell: (row) => row.checkIns,
            tone: (row) => (row.checkIns > 0 ? 'green' : 'rose'),
          },
        ]}
        rows={[
          { checkIns: 14, code: 'CSC 405', id: 'course-1' },
          { checkIns: 0, code: 'CSC 407', id: 'course-2' },
        ]}
      />,
    );

    expect(screen.getByText('CSC 405').closest('td')).toHaveClass(
      'text-blue-700',
      'dark:text-blue-300',
    );
    expect(screen.getByText('14').closest('td')).toHaveClass(
      'text-emerald-700',
      'dark:text-emerald-300',
    );
    expect(screen.getByText('0').closest('td')).toHaveClass('text-rose-700', 'dark:text-rose-300');
  });

  it('distinguishes course and registration identifiers with labelled colour', () => {
    render(
      <>
        <IdentifierBadge tone="blue">CSC 401</IdentifierBadge>
        <IdentifierBadge tone="violet">LMU/CSC/2026/001</IdentifierBadge>
      </>,
    );

    expect(screen.getByText('CSC 401')).toHaveClass('bg-blue-100', 'dark:bg-blue-950');
    expect(screen.getByText('LMU/CSC/2026/001')).toHaveClass('bg-violet-100', 'dark:bg-violet-950');
  });

  it('keeps the dashboard top navigation prominent in light and dark themes', () => {
    render(
      <MemoryRouter>
        <DashboardTopbar
          canViewNotifications
          canViewReports
          institutionName="Lagos Metropolitan University"
          onMenu={() => undefined}
          onSignOut={() => undefined}
          onToggleTheme={() => undefined}
          signingOut={false}
          theme="dark"
          unreadNotifications={2}
          user={{
            email: 'admin@lmu.edu.ng',
            fullName: 'Attendity Admin',
            id: 'admin-1',
            role: 'university_admin',
            universityId: 'university-1',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner')).toHaveClass(
      'bg-university-navy',
      'border-emerald-700',
      'dark:bg-slate-950',
    );
  });

  it('communicates percentage levels with both text and semantic colour', () => {
    render(
      <>
        <PercentageValue value={48} />
        <PercentageValue value={68} />
        <PercentageValue value={81} />
      </>,
    );

    expect(screen.getByText('48%')).toHaveClass('text-rose-700', 'dark:text-rose-300');
    expect(screen.getByText('68%')).toHaveClass('text-amber-700', 'dark:text-amber-300');
    expect(screen.getByText('81%')).toHaveClass('text-emerald-700', 'dark:text-emerald-300');
  });
});
