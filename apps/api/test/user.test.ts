import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestActor } from '@qr/types';
import { updateUserStatusSchema } from '../src/validators/user.validator.js';

process.env.MONGODB_URI = 'mongodb://localhost:27017/attendity_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.REPORT_SIGNING_SECRET = 'test-report-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const currentUser: RequestActor = {
  id: '507f1f77bcf86cd799439011',
  universityId: '507f191e810c19729de860ea',
  email: 'admin@example.edu',
  fullName: 'Test Administrator',
  role: 'university_admin',
  sessionId: 'test-session',
  permissions: ['users:write'],
};

void describe('user provisioning controls', () => {
  void it('accepts operational account statuses but not pending resets', () => {
    for (const status of ['active', 'locked', 'suspended'])
      assert.equal(
        updateUserStatusSchema.safeParse({
          params: { userId: '507f1f77bcf86cd799439012' },
          body: { status },
        }).success,
        true,
      );
    assert.equal(
      updateUserStatusSchema.safeParse({
        params: { userId: '507f1f77bcf86cd799439012' },
        body: { status: 'pending_verification' },
      }).success,
      false,
    );
  });

  void it('prevents administrators from suspending themselves', async () => {
    const { userService } = await import('../src/services/user.service.js');
    await assert.rejects(
      userService.updateStatus(currentUser, currentUser.id, 'suspended'),
      (error: Error & { statusCode?: number }) => error.statusCode === 409,
    );
  });
});
