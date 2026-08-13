import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AnalyticsDataset } from '../src/repositories/analytics.repository.js';
import {
  analyticsOverviewQuerySchema,
  analyticsReportQuerySchema,
} from '../src/validators/analytics.validator.js';
import { notificationListQuerySchema } from '../src/validators/notification.validator.js';

process.env.MONGODB_URI = 'mongodb://localhost:27017/attendity_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const dataset: AnalyticsDataset = {
  courses: [
    {
      id: 'course-1',
      code: 'CSC 401',
      title: 'Software Engineering',
      departmentId: 'department-1',
      departmentName: 'Computer Science',
      facultyName: 'Science',
      attendanceRequirement: 75,
    },
  ],
  sessions: [1, 2, 3, 4].map((index) => ({
    id: `session-${index}`,
    courseId: 'course-1',
    openedAt: new Date(`2026-07-0${index}T09:00:00.000Z`),
    status: 'closed' as const,
  })),
  registrations: [
    {
      id: 'registration-1',
      courseId: 'course-1',
      studentId: 'student-1',
      registrationNumber: 'CSC/2024/001',
    },
  ],
  records: [
    {
      id: 'record-1',
      sessionId: 'session-1',
      courseId: 'course-1',
      studentId: 'student-1',
      checkedInAt: new Date('2026-07-01T09:05:00.000Z'),
      status: 'present',
      gpsVerified: true,
      faceVerified: false,
    },
  ],
  students: [{ id: 'student-1', fullName: 'Ada Student' }],
};

void describe('analytics validation', () => {
  void it('bounds analytics periods and applies defaults', () => {
    const result = analyticsOverviewQuerySchema.safeParse({ query: {} });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.query.days, 30);
    assert.equal(analyticsOverviewQuerySchema.safeParse({ query: { days: 6 } }).success, false);
    assert.equal(analyticsOverviewQuerySchema.safeParse({ query: { days: 366 } }).success, false);
  });

  void it('requires a course identifier for course reports and validates date order', () => {
    assert.equal(
      analyticsReportQuerySchema.safeParse({ query: { scope: 'course' } }).success,
      false,
    );
    assert.equal(
      analyticsReportQuerySchema.safeParse({
        query: { scope: 'risk', from: '2026-07-20', to: '2026-07-01' },
      }).success,
      false,
    );
  });

  void it('validates notification filters and pagination', () => {
    assert.equal(
      notificationListQuerySchema.safeParse({ query: { status: 'unread', page: 1 } }).success,
      true,
    );
    assert.equal(
      notificationListQuerySchema.safeParse({ query: { status: 'unknown' } }).success,
      false,
    );
  });
});

void describe('attendance intelligence', () => {
  void it('calculates an explainable critical risk from live attendance history', async () => {
    const { calculateAttendanceRisks } = await import('../src/services/analytics.service.js');
    const risk = calculateAttendanceRisks(dataset)[0];
    assert.ok(risk);
    assert.equal(risk.currentAttendance, 25);
    assert.equal(risk.requiredAttendance, 75);
    assert.equal(risk.level, 'critical');
    assert.equal(risk.confidence, 70);
    assert.match(risk.reason, /1 of 4/);
    assert.match(risk.recommendation, /next 8 lectures/);
  });

  void it('uses stable risk boundaries and safe zero-denominator percentages', async () => {
    const { calculatePercentage, calculateRiskLevel } =
      await import('../src/services/analytics.service.js');
    assert.equal(calculatePercentage(1, 0), 0);
    assert.equal(calculatePercentage(3, 4), 75);
    assert.equal(calculateRiskLevel(90, 88, 75, 8), 'low');
    assert.equal(calculateRiskLevel(74, 70, 75, 8), 'high');
    assert.equal(calculateRiskLevel(50, 55, 75, 4), 'critical');
  });

  void it('stores session-ending notification state for idempotent workers', async () => {
    const { AttendanceSessionModel } = await import('../src/models/attendance-session.model.js');
    assert.ok(AttendanceSessionModel.schema.path('endingNotificationSentAt'));
  });

  void it('indexes notifications for newest-first recipient queries', async () => {
    const { NotificationModel } = await import('../src/models/notification.model.js');
    const index = NotificationModel.schema
      .indexes()
      .find(
        ([fields]) =>
          fields.universityId === 1 && fields.recipientId === 1 && fields.createdAt === -1,
      );
    assert.ok(index);
  });
});
