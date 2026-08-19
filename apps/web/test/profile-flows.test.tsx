import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '../src/features/auth/register-page.js';
import { LecturerProfileForm } from '../src/features/profiles/lecturer-profile-form.js';
import { ProfilePhotoField } from '../src/features/profiles/profile-photo-field.js';
import { StudentProfileForm } from '../src/features/profiles/student-profile-form.js';
import { ThemeProvider } from '../src/contexts/theme-context.js';
import { FormActionFeedback } from '../src/components/form-action-feedback.js';

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:attendity-photo'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const structureBase = {
  description: '',
  isCurrent: false,
  status: 'active' as const,
  createdAt: '2026-08-12T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
};
const academicStructures = [
  {
    ...structureBase,
    id: 'campus-a',
    kind: 'campus' as const,
    code: 'CAM-A',
    name: 'North Campus',
  },
  {
    ...structureBase,
    id: 'campus-b',
    kind: 'campus' as const,
    code: 'CAM-B',
    name: 'South Campus',
  },
  {
    ...structureBase,
    id: 'faculty-a',
    kind: 'faculty' as const,
    code: 'FAC-A',
    name: 'Science',
    parent: { id: 'campus-a', kind: 'campus' as const, code: 'CAM-A', name: 'North Campus' },
  },
  {
    ...structureBase,
    id: 'faculty-b',
    kind: 'faculty' as const,
    code: 'FAC-B',
    name: 'Law',
    parent: { id: 'campus-b', kind: 'campus' as const, code: 'CAM-B', name: 'South Campus' },
  },
  {
    ...structureBase,
    id: 'programme-a',
    kind: 'programme' as const,
    code: 'BSC-CS',
    name: 'Computer Science',
    parent: { id: 'faculty-a', kind: 'faculty' as const, code: 'FAC-A', name: 'Science' },
  },
  {
    ...structureBase,
    id: 'level-a',
    kind: 'level' as const,
    code: 'L100',
    name: '100 Level',
    parent: {
      id: 'programme-a',
      kind: 'programme' as const,
      code: 'BSC-CS',
      name: 'Computer Science',
    },
  },
  {
    ...structureBase,
    id: 'session-a',
    kind: 'academic_session' as const,
    code: '2026-2027',
    name: '2026/2027',
  },
];
const profileDepartments = [
  { _id: 'department-a', code: 'CSC', name: 'Computer Science', facultyName: 'Science' },
  { _id: 'department-b', code: 'LAW', name: 'Public Law', facultyName: 'Law' },
];

describe('role profile entry points', () => {
  it('preserves student-only registration when assessment registration is disabled', () => {
    vi.stubEnv('VITE_ALLOW_DEMO_ROLE_REGISTRATION', 'false');
    render(
      <ThemeProvider>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </ThemeProvider>,
    );
    expect(screen.getByText('Student registration')).toBeVisible();
    expect(screen.getByText(/staff accounts are created by invitation/i)).toBeVisible();
  });

  it('shows institution-specific matriculation guidance', () => {
    render(
      <StudentProfileForm
        departments={[]}
        identifier={{
          label: 'Matriculation number',
          example: 'LMU/CSC/2026/001',
          guidance: 'Use the number printed on your admission record.',
          pattern: '^[A-Z/0-9]+$',
        }}
        onSubmit={vi.fn()}
        structures={[]}
      />,
    );
    expect(screen.getByLabelText('Matriculation number')).toHaveAttribute(
      'placeholder',
      'LMU/CSC/2026/001',
    );
    expect(screen.getByText('Use the number printed on your admission record.')).toBeVisible();
  });

  it('keeps bold profile save feedback beside the form action', () => {
    render(
      <StudentProfileForm
        departments={[]}
        feedback={<FormActionFeedback message="Profile saved." status="success" />}
        identifier={{
          label: 'Matriculation number',
          example: 'ATD/CSC/001',
          guidance: 'Use the identifier issued by Registry.',
          pattern: '^[A-Z/0-9]+$',
        }}
        onSubmit={vi.fn()}
        structures={[]}
      />,
    );

    expect(screen.getByTestId('student-profile-actions')).toContainElement(
      screen.getByRole('status'),
    );
    expect(screen.getByRole('status')).toHaveClass('font-bold');
  });

  it('previews a valid selected profile photograph and reports that it is ready to save', () => {
    const onChange = vi.fn();
    render(<ProfilePhotoField onChange={onChange} />);
    const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'student.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('Profile photograph'), {
      target: { files: [photo] },
    });

    expect(screen.getByAltText('Selected profile preview')).toHaveAttribute(
      'src',
      'blob:attendity-photo',
    );
    expect(screen.getByText(/student\.jpg/i)).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(/upload when you save/i);
    expect(onChange).toHaveBeenLastCalledWith(photo);
  });

  it('rejects an unsupported profile photograph without selecting it', () => {
    const onChange = vi.fn();
    render(<ProfilePhotoField onChange={onChange} />);
    const photo = new File(['not-an-image'], 'student.gif', { type: 'image/gif' });

    fireEvent.change(screen.getByLabelText('Profile photograph'), {
      target: { files: [photo] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/jpeg, png, or webp/i);
    expect(onChange).not.toHaveBeenCalledWith(photo);
  });

  it('clears a pending photograph and returns to the saved photograph', () => {
    const onChange = vi.fn();
    render(
      <ProfilePhotoField
        currentPhotoUrl="https://res.cloudinary.com/demo/image/upload/current.webp"
        onChange={onChange}
      />,
    );
    const photo = new File([new Uint8Array([137, 80, 78, 71])], 'replacement.png', {
      type: 'image/png',
    });
    fireEvent.change(screen.getByLabelText('Profile photograph'), {
      target: { files: [photo] },
    });

    fireEvent.click(screen.getByRole('button', { name: /clear selected photograph/i }));

    expect(screen.getByAltText('Current profile photograph')).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/demo/image/upload/current.webp',
    );
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('filters and resets the student academic hierarchy when a campus changes', () => {
    render(
      <StudentProfileForm
        departments={profileDepartments}
        identifier={{
          label: 'Matriculation number',
          example: 'ATD/CSC/001',
          guidance: 'Use the identifier issued by Registry.',
          pattern: '^[A-Z/0-9]+$',
        }}
        onSubmit={vi.fn()}
        structures={academicStructures}
      />,
    );

    fireEvent.change(screen.getByLabelText('Campus'), { target: { value: 'campus-a' } });
    expect(screen.getByRole('option', { name: /FAC-A.*Science/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /FAC-B.*Law/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Faculty or school'), {
      target: { value: 'faculty-a' },
    });
    fireEvent.change(screen.getByLabelText('Department'), {
      target: { value: 'department-a' },
    });
    fireEvent.change(screen.getByLabelText('Programme'), {
      target: { value: 'programme-a' },
    });
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'level-a' } });

    fireEvent.change(screen.getByLabelText('Campus'), { target: { value: 'campus-b' } });

    expect(screen.getByLabelText('Faculty or school')).toHaveValue('');
    expect(screen.getByLabelText('Department')).toHaveValue('');
    expect(screen.getByLabelText('Programme')).toHaveValue('');
    expect(screen.getByLabelText('Level')).toHaveValue('');
  });

  it('filters and resets lecturer faculty and department choices by campus', () => {
    render(
      <LecturerProfileForm
        assignments={[]}
        departments={profileDepartments}
        isPending={false}
        onSubmit={vi.fn()}
        structures={academicStructures}
      />,
    );

    fireEvent.change(screen.getByLabelText('Campus'), { target: { value: 'campus-a' } });
    expect(screen.getByRole('option', { name: /FAC-A.*Science/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /FAC-B.*Law/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Faculty or school'), {
      target: { value: 'faculty-a' },
    });
    fireEvent.change(screen.getByLabelText('Department'), {
      target: { value: 'department-a' },
    });

    fireEvent.change(screen.getByLabelText('Campus'), { target: { value: 'campus-b' } });

    expect(screen.getByLabelText('Faculty or school')).toHaveValue('');
    expect(screen.getByLabelText('Department')).toHaveValue('');
  });
});
