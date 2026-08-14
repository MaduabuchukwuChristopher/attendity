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
    assert.equal(
      analyticsReportQuerySchema.safeParse({
        query: { scope: 'university', from: '08/01/2026', to: '2026-08-12' },
      }).success,
      false,
    );
    const valid = analyticsReportQuerySchema.safeParse({
      query: { scope: 'university', from: '2026-08-01', to: '2026-08-12' },
    });
    assert.equal(valid.success, true);
    if (valid.success) assert.equal(valid.data.query.from, '2026-08-01');
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

  void it('builds report rows from selected-range sessions with newest attendance first', async () => {
    const { buildAnalyticsReportRows } = await import('../src/services/analytics.service.js');
    const reportDataset: AnalyticsDataset = {
      courses: [
        ...dataset.courses,
        {
          ...dataset.courses[0]!,
          id: 'course-without-sessions',
          code: 'CSC 499',
          title: 'Research Project',
        },
      ],
      sessions: dataset.sessions,
      registrations: [
        ...dataset.registrations,
        {
          id: 'registration-2',
          courseId: 'course-1',
          studentId: 'student-2',
          registrationNumber: 'CSC/2024/002',
        },
        {
          id: 'registration-3',
          courseId: 'course-1',
          studentId: 'student-3',
          registrationNumber: 'CSC/2024/003',
        },
        {
          id: 'registration-4',
          courseId: 'course-without-sessions',
          studentId: 'student-4',
          registrationNumber: 'CSC/2024/004',
        },
      ],
      records: [
        ...dataset.records,
        {
          ...dataset.records[0]!,
          id: 'record-2',
          sessionId: 'session-4',
          studentId: 'student-2',
          checkedInAt: new Date('2026-07-04T09:06:00.000Z'),
        },
      ],
      students: [
        ...dataset.students,
        { id: 'student-2', fullName: 'Bola Recent' },
        { id: 'student-3', fullName: 'Chidi Absent' },
        { id: 'student-4', fullName: 'Dayo No Session' },
      ],
    };

    const rows = buildAnalyticsReportRows(reportDataset, 'university');

    assert.deepEqual(
      rows.map((row) => row.studentName),
      ['Bola Recent', 'Ada Student', 'Chidi Absent'],
    );
    assert.equal(rows[0]?.latestAttendanceAt, '2026-07-04T09:06:00.000Z');
    assert.equal(rows[2]?.latestAttendanceAt, undefined);
    assert.equal(
      rows.some((row) => row.courseCode === 'CSC 499'),
      false,
    );
  });

  void it('paginates previews but keeps every filtered row for exports', async () => {
    const { selectAnalyticsReportRows } = await import('../src/services/analytics.service.js');
    const rows = Array.from({ length: 30 }, (_, index) => ({ id: `row-${index + 1}` }));

    const preview = selectAnalyticsReportRows(rows, 2, 10, false);
    const complete = selectAnalyticsReportRows(rows, 2, 10, true);

    assert.deepEqual(
      preview.rows.map((row) => row.id),
      rows.slice(10, 20).map((row) => row.id),
    );
    assert.equal(preview.pagination.total, 30);
    assert.equal(preview.pagination.pages, 3);
    assert.equal(complete.rows.length, 30);
    assert.equal(complete.pagination.page, 1);
    assert.equal(complete.pagination.pages, 1);
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
