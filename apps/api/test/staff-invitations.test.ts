import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canInviteRole } from '../src/services/invitation.service.js';
import {
  acceptInvitationSchema,
  createInvitationSchema,
  invitationTokenSchema,
} from '../src/validators/invitation.validator.js';

const strongPassword = 'Attendity!Secure2026';

void describe('staff invitation boundaries', () => {
  void it('accepts lecturer invitations but rejects student and super-admin invitations', () => {
    assert.equal(
      createInvitationSchema.safeParse({
        body: { email: 'lecturer@example.edu', role: 'lecturer' },
      }).success,
      true,
    );
    for (const role of ['student', 'super_admin'])
      assert.equal(
        createInvitationSchema.safeParse({
          body: { email: 'unsafe@example.edu', role },
        }).success,
        false,
      );
  });

  void it('allows institution administrators to invite staff but not system administrators', () => {
    assert.equal(canInviteRole('university_admin', 'lecturer'), true);
    assert.equal(canInviteRole('university_admin', 'university_admin'), true);
    assert.equal(canInviteRole('faculty_admin', 'lecturer'), false);
    assert.equal(canInviteRole('lecturer', 'viewer'), false);
  });

  void it('requires secure invitation tokens and the established password policy', () => {
    const token = 'a'.repeat(43);
    assert.equal(invitationTokenSchema.safeParse({ params: { token } }).success, true);
    assert.equal(
      acceptInvitationSchema.safeParse({
        body: { token, firstName: 'Ada', lastName: 'Mensah', password: strongPassword },
      }).success,
      true,
    );
    assert.equal(
      acceptInvitationSchema.safeParse({
        body: { token: 'short', firstName: 'Ada', lastName: 'Mensah', password: 'weak' },
      }).success,
      false,
    );
  });
});
