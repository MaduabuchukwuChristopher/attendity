import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COURSE_REGISTRATION_SOURCES,
  COURSE_REGISTRATION_STATUSES,
  STAFF_INVITABLE_ROLES,
} from '@qr/shared';
import { CurriculumMappingModel } from '../src/models/curriculum-mapping.model.js';
import { LecturerAssignmentModel } from '../src/models/lecturer-assignment.model.js';
import { LecturerProfileModel } from '../src/models/lecturer-profile.model.js';
import { StaffInvitationModel } from '../src/models/staff-invitation.model.js';
import { StudentProfileModel } from '../src/models/student-profile.model.js';

void describe('role profile and curriculum domain', () => {
  void it('allows privileged staff invitations but never student invitations', () => {
    assert.equal(STAFF_INVITABLE_ROLES.includes('lecturer'), true);
    assert.equal(STAFF_INVITABLE_ROLES.includes('university_admin'), true);
    assert.equal(
      STAFF_INVITABLE_ROLES.some((role) => role === ('student' as never)),
      false,
    );
  });

  void it('supports explicit curriculum registration sources and review states', () => {
    assert.deepEqual(COURSE_REGISTRATION_SOURCES, [
      'core',
      'elective',
      'borrowed',
      'administrator',
    ]);
    assert.deepEqual(COURSE_REGISTRATION_STATUSES, [
      'pending',
      'approved',
      'rejected',
      'withdrawn',
    ]);
  });

  void it('defines tenant-linked profile and academic models', () => {
    assert.ok(StudentProfileModel.schema.path('universityId'));
    assert.ok(StudentProfileModel.schema.path('matricNumber'));
    assert.ok(LecturerProfileModel.schema.path('employeeNumber'));
    assert.ok(StaffInvitationModel.schema.path('tokenHash'));
    assert.ok(CurriculumMappingModel.schema.path('classification'));
    assert.ok(LecturerAssignmentModel.schema.path('termId'));
  });
});
