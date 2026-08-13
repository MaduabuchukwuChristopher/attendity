import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttendanceHistory } from '../src/features/attendance/attendance-history.js';
import { StudentProfileForm } from '../src/features/profiles/student-profile-form.js';

function expectIconHeading(name: string) {
  expect(screen.getByRole('heading', { name })).toBeVisible();
}

describe('dashboard secondary page semantics', () => {
  it('uses colored icon headings for student identity and academic placement cards', () => {
    render(
      <StudentProfileForm
        departments={[]}
        identifier={{
          label: 'Matriculation number',
          example: 'ATD/CSC/2026/001',
          pattern: '.*',
          guidance: 'Use your institution-issued number.',
        }}
        onSubmit={vi.fn()}
        structures={[]}
      />,
    );

    expectIconHeading('Identity and contact');
    expectIconHeading('Academic placement');
    expect(screen.getAllByTestId('card-header-icon')[0]).toHaveClass('bg-blue-700');
    expect(screen.getAllByTestId('card-header-icon')[1]).toHaveClass('bg-violet-700');
  });

  it('uses colored icon headings for the attendance activity and calendar cards', () => {
    render(<AttendanceHistory days={{}} />);

    expectIconHeading('Attendance activity');
    expectIconHeading(
      new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()),
    );
    expect(screen.getAllByTestId('card-header-icon')[0]).toHaveClass('bg-emerald-700');
    expect(screen.getAllByTestId('card-header-icon')[1]).toHaveClass('bg-blue-700');
  });
});
