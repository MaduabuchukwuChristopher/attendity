import type { AuthenticatedUser } from '@qr/types';
import { ROLE_PERMISSIONS } from '@qr/shared';
import { describe, expect, it } from 'vitest';
import { buildDashboardNavigation } from '../src/layouts/dashboard-nav-config.js';

const user = (role: AuthenticatedUser['role']): AuthenticatedUser => ({
  id: `${role}-id`,
  universityId: 'university-id',
  email: `${role}@example.edu`,
  fullName: 'Attendity User',
  role,
});

const labels = (role: AuthenticatedUser['role']) =>
  buildDashboardNavigation(user(role), ROLE_PERMISSIONS[role])
    .flatMap((group) => group.items)
    .map((item) => item.label);

describe('role-aware dashboard navigation', () => {
  it('gives institution administrators direct staff and curriculum actions', () => {
    expect(labels('university_admin')).toEqual(
      expect.arrayContaining(['Workspace', 'Invite staff', 'Curriculum', 'My profile', 'Security']),
    );
  });

  it('keeps management destinations out of the student navigation', () => {
    const studentLabels = labels('student');

    expect(studentLabels).toEqual(expect.arrayContaining(['Workspace', 'My profile', 'Security']));
    expect(studentLabels).not.toEqual(
      expect.arrayContaining(['Invite staff', 'Curriculum', 'People']),
    );
  });

  it('uses the dedicated workspace path for lecturers', () => {
    const workspace = buildDashboardNavigation(user('lecturer'), ROLE_PERMISSIONS.lecturer)
      .flatMap((group) => group.items)
      .find((item) => item.label === 'Workspace');

    expect(workspace?.to).toBe('/app/lecturer');
  });
});
