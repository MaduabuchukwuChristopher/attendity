import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Permission, RequestActor } from '@qr/types';
import {
  createRegistrationSchema,
  borrowedCourseIdentifierSchema,
  borrowedCourseRequestSchema,
  borrowedCourseReviewSchema,
  borrowedCourseUpdateSchema,
  electiveCourseSelectionSchema,
  updateRegistrationSchema,
} from '../src/validators/registration.validator.js';

const studentId = '507f1f77bcf86cd799439011';
const courseId = '507f191e810c19729de860ea';

void describe('course registration validation', () => {
  void it('accepts a valid registration request', () => {
    const result = createRegistrationSchema.safeParse({
      body: {
        studentId,
        courseId,
        registrationNumber: '  STU-2026-001  ',
      },
    });

    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.body.registrationNumber, 'STU-2026-001');
  });

  void it('rejects malformed tenant record identifiers', () => {
    const result = createRegistrationSchema.safeParse({
      body: {
        studentId: 'student-from-another-source',
        courseId,
        registrationNumber: 'STU-2026-001',
      },
    });

    assert.equal(result.success, false);
  });

  void it('allows approval and withdrawal but not direct pending resets', () => {
    for (const status of ['approved', 'withdrawn']) {
      assert.equal(
        updateRegistrationSchema.safeParse({
          params: { registrationId: studentId },
          body: { status },
        }).success,
        true,
      );
    }

    assert.equal(
      updateRegistrationSchema.safeParse({
        params: { registrationId: studentId },
        body: { status: 'pending' },
      }).success,
      false,
    );
  });

  void it('enforces one active registration per student and course', async () => {
    const { CourseRegistrationModel } = await import('../src/models/course-registration.model.js');
    const compoundIndex = CourseRegistrationModel.schema
      .indexes()
      .find(
        ([fields]) => fields.universityId === 1 && fields.studentId === 1 && fields.courseId === 1,
      );

    assert.ok(compoundIndex);
    assert.equal(compoundIndex[1].unique, true);
    assert.deepEqual(compoundIndex[1].partialFilterExpression, { deletedAt: null });
  });

  void it('validates the borrowed-course request and review lifecycle', () => {
    assert.equal(
      borrowedCourseRequestSchema.safeParse({
        body: { courseId, reason: 'This supports my approved interdisciplinary study plan.' },
      }).success,
      true,
    );
    assert.equal(
      borrowedCourseUpdateSchema.safeParse({
        params: { registrationId: studentId },
        body: { reason: 'Updated academic justification for this borrowed course request.' },
      }).success,
      true,
    );
    assert.equal(
      borrowedCourseReviewSchema.safeParse({
        params: { registrationId: studentId },
        body: { decision: 'reject', note: 'The request needs departmental approval first.' },
      }).success,
      true,
    );
    assert.equal(
      borrowedCourseIdentifierSchema.safeParse({ params: { registrationId: 'invalid' } }).success,
      false,
    );
  });

  void it('accepts only a valid mapped course identifier for elective selection', () => {
    assert.equal(electiveCourseSelectionSchema.safeParse({ body: { courseId } }).success, true);
    assert.equal(
      electiveCourseSelectionSchema.safeParse({ body: { courseId: 'not-a-course' } }).success,
      false,
    );
  });
});

void describe('course registration authorization', () => {
  void it('requires every permission requested by a route', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/attendity_test';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
    process.env.CORS_ORIGIN = 'http://localhost:5173';

    const { authorize } = await import('../src/middlewares/auth.middleware.js');
    const handler = authorize('courses:read', 'users:read');

    const actor = (permissions: readonly Permission[]): RequestActor => ({
      id: studentId,
      universityId: courseId,
      email: 'admin@example.edu',
      fullName: 'Test Administrator',
      role: 'university_admin',
      sessionId: 'test-session',
      permissions,
    });

    let error: unknown;
    handler({ actor: actor(['courses:read']) } as never, {} as never, (received?: unknown) => {
      error = received;
    });

    assert.equal((error as { statusCode?: number }).statusCode, 403);

    error = new Error('next was not called');
    handler(
      { actor: actor(['courses:read', 'users:read']) } as never,
      {} as never,
      (received?: unknown) => {
        error = received;
      },
    );

    assert.equal(error, undefined);
  });

  void it('authenticates a signed access token at runtime', async () => {
    const [{ authenticate }, { signAccessToken }] = await Promise.all([
      import('../src/middlewares/auth.middleware.js'),
      import('../src/utils/tokens.js'),
    ]);
    const token = signAccessToken({
      sub: studentId,
      universityId: courseId,
      role: 'university_admin',
    });
    const request: {
      actor?: RequestActor;
      get: (header: string) => string | undefined;
    } = {
      get: (header) => (header === 'authorization' ? `Bearer ${token}` : undefined),
    };
    let error: unknown = new Error('next was not called');

    authenticate(request as never, {} as never, (received?: unknown) => {
      error = received;
    });

    assert.equal(error, undefined);
    assert.equal(request.actor?.id, studentId);
    assert.equal(request.actor?.universityId, courseId);
    assert.equal(request.actor?.role, 'university_admin');
  });
});
