import './setup.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ExcelJS from 'exceljs';
import { ROLE_PERMISSIONS } from '@qr/shared';
import { AttendanceRecordModel } from '../src/models/attendance-record.model.js';
import { AttendanceSessionModel } from '../src/models/attendance-session.model.js';
import { EventModel } from '../src/models/event.model.js';
import { EventNotificationDeliveryModel } from '../src/models/event-notification-delivery.model.js';
import { EventRegistrationModel } from '../src/models/event-registration.model.js';
import { EventReportSnapshotModel } from '../src/models/event-report-snapshot.model.js';
import { EventVerificationAttemptModel } from '../src/models/event-verification-attempt.model.js';
import { authorize } from '../src/middlewares/auth.middleware.js';
import { eventExportService } from '../src/services/event-export.service.js';
import {
  createEventSchema,
  eventAnalyticsQuerySchema,
  eventCheckInSchema,
  eventHistoryQuerySchema,
  manualEventAttendanceSchema,
} from '../src/validators/event.validator.js';
import type { EventAnalytics, EventSummary, RequestActor } from '@qr/types';

const eventId = '6650f27f52cf1956c94d0111';
process.env.MONGODB_URI = 'mongodb://localhost:27017/attendity_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:5173';
const validEvent = {
  title: 'Academic Success Orientation',
  description: 'A mandatory briefing about attendance, academic support, and semester success.',
  eventType: 'orientation',
  campus: 'Main Campus',
  venue: 'University Multipurpose Hall',
  startsAt: '2026-08-10T09:00:00.000Z',
  endsAt: '2026-08-10T11:00:00.000Z',
  timeZone: 'Africa/Lagos',
  registrationRequired: false,
  mandatory: true,
  audience: { roles: ['student'], level: '400 Level' },
  reminderOffsetsMinutes: [1440, 60],
  notificationChannels: ['in_app'],
  attendanceMethods: ['dynamic_qr', 'manual', 'pin'],
  qrRotationSeconds: 60,
  faceVerificationRequired: false,
  manualAttendanceAllowed: true,
  pinAttendanceAllowed: true,
  attendancePin: '294681',
  attachments: [],
};

void describe('event contracts and permissions', () => {
  void it('accepts a tenant event with multiple attendance methods', () => {
    assert.equal(createEventSchema.safeParse({ body: validEvent }).success, true);
  });

  void it('requires GPS coordinates, configured method flags, and a secure PIN', () => {
    assert.equal(
      createEventSchema.safeParse({ body: { ...validEvent, attendanceMethods: ['gps'] } }).success,
      false,
    );
    assert.equal(
      createEventSchema.safeParse({ body: { ...validEvent, attendancePin: '123' } }).success,
      false,
    );
    assert.equal(
      createEventSchema.safeParse({
        body: { ...validEvent, attendanceMethods: ['manual'], manualAttendanceAllowed: false },
      }).success,
      false,
    );
  });

  void it('validates dynamic QR, PIN, and authorized manual attendance requests', () => {
    assert.equal(
      eventCheckInSchema.safeParse({ params: { eventId }, body: { code: 'ABCDEF12' } }).success,
      true,
    );
    assert.equal(
      eventCheckInSchema.safeParse({ params: { eventId }, body: { pin: '294681' } }).success,
      true,
    );
    assert.equal(eventCheckInSchema.safeParse({ params: { eventId }, body: {} }).success, false);
    assert.equal(
      manualEventAttendanceSchema.safeParse({
        params: { eventId },
        body: { userId: eventId, status: 'excused', reason: 'Approved medical absence.' },
      }).success,
      true,
    );
  });

  void it('enforces read-only event access for students, examiners, and viewers', () => {
    for (const role of [
      'super_admin',
      'university_admin',
      'faculty_admin',
      'department_admin',
      'lecturer',
    ] as const) {
      assert.ok(ROLE_PERMISSIONS[role].includes('events:read'));
      assert.ok(ROLE_PERMISSIONS[role].includes('events:write'));
    }
    for (const role of ['student', 'examiner', 'viewer'] as const) {
      assert.ok(ROLE_PERMISSIONS[role].includes('events:read'));
      assert.equal(ROLE_PERMISSIONS[role].includes('events:write'), false);
    }
  });

  void it('protects event analytics and manual attendance with event-management permission', () => {
    const student = {
      id: eventId,
      universityId: eventId,
      role: 'student',
      email: 'student@example.edu',
      fullName: 'Ada Student',
      sessionId: 'session-1',
      permissions: ROLE_PERMISSIONS.student,
    } satisfies RequestActor;
    const administrator = {
      ...student,
      role: 'university_admin',
      permissions: ROLE_PERMISSIONS.university_admin,
    } satisfies RequestActor;
    const middleware = authorize('events:write');
    const result = (actor: RequestActor) => {
      let statusCode = 0;
      middleware({ actor } as never, {} as never, (error?: unknown) => {
        statusCode =
          typeof error === 'object' && error && 'statusCode' in error
            ? Number(error.statusCode)
            : 200;
      });
      return statusCode;
    };
    assert.equal(result(student), 403);
    assert.equal(result(administrator), 200);
  });

  void it('validates bounded student-history and analytics filters', () => {
    assert.equal(
      eventHistoryQuerySchema.safeParse({
        query: { mandatory: 'true', status: 'present', page: '1', limit: '25' },
      }).success,
      true,
    );
    assert.equal(
      eventHistoryQuerySchema.safeParse({ query: { page: '0', limit: '1000' } }).success,
      false,
    );
    assert.equal(
      eventAnalyticsQuerySchema.safeParse({
        params: { eventId },
        query: { from: '2026-08-11T10:00:00.000Z', to: '2026-08-10T10:00:00.000Z' },
      }).success,
      false,
    );
  });
});

void describe('event attendance data isolation and security', () => {
  void it('defines tenant-unique audience registrations and attendance records', () => {
    assert.ok(
      EventRegistrationModel.schema
        .indexes()
        .some(
          ([fields, options]) =>
            fields.universityId === 1 &&
            fields.eventId === 1 &&
            fields.userId === 1 &&
            options.unique === true,
        ),
    );
    assert.ok(
      AttendanceRecordModel.schema
        .indexes()
        .some(
          ([fields, options]) =>
            fields.universityId === 1 &&
            fields.sessionId === 1 &&
            fields.studentId === 1 &&
            options.unique === true,
        ),
    );
  });

  void it('indexes scheduled events and event attendance contexts', () => {
    assert.ok(
      EventModel.schema
        .indexes()
        .some(
          ([fields]) => fields.universityId === 1 && fields.status === 1 && fields.startsAt === 1,
        ),
    );
    assert.ok(
      AttendanceSessionModel.schema
        .indexes()
        .some(
          ([fields]) =>
            fields.universityId === 1 && fields.contextType === 1 && fields.eventId === 1,
        ),
    );
    assert.equal(AttendanceSessionModel.schema.path('attendancePinHash').options.select, false);
  });

  void it('persists idempotent notification retries and one final report per tenant event', () => {
    assert.ok(
      EventNotificationDeliveryModel.schema
        .indexes()
        .some(
          ([fields, options]) =>
            fields.universityId === 1 && fields.idempotencyKey === 1 && options.unique === true,
        ),
    );
    assert.ok(
      EventReportSnapshotModel.schema
        .indexes()
        .some(
          ([fields, options]) =>
            fields.universityId === 1 && fields.eventId === 1 && options.unique === true,
        ),
    );
    assert.equal(
      EventNotificationDeliveryModel.schema.path('recipientEmail').options.select,
      false,
    );
    assert.equal(EventVerificationAttemptModel.schema.path('ipHash').options.select, false);
    assert.equal(EventVerificationAttemptModel.schema.path('deviceHash').options.select, false);
  });

  void it('round-trips encrypted event QR context and rejects cross-context assumptions', async () => {
    const { createQrToken, verifyQrToken } = await import('../src/services/qr-token.service.js');
    const payload = {
      sessionId: 'event-session-1',
      universityId: 'university-1',
      contextType: 'EVENT_SESSION' as const,
      contextId: 'event-1',
      eventId: 'event-1',
      ownerId: 'organizer-1',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      nonce: 'event-secure-random-nonce-value',
    };
    const verified = verifyQrToken(createQrToken(payload));
    assert.deepEqual(verified, payload);
    assert.equal(verified.contextType, 'EVENT_SESSION');
    assert.equal(verified.eventId, 'event-1');
    assert.equal('courseId' in verified, false);
  });
});

void describe('event analytics exports', () => {
  const event = {
    id: eventId,
    title: validEvent.title,
    description: validEvent.description,
    eventType: 'orientation',
    organizerId: eventId,
    organizerName: 'Chidinma Okeke',
    venue: validEvent.venue,
    startsAt: validEvent.startsAt,
    endsAt: validEvent.endsAt,
    timeZone: validEvent.timeZone,
    registrationRequired: false,
    mandatory: true,
    audience: { roles: ['student'] },
    reminderOffsetsMinutes: [60],
    notificationChannels: ['in_app'],
    participantReportAvailable: false,
    attendanceMethods: ['dynamic_qr'],
    qrRotationSeconds: 60,
    faceVerificationRequired: false,
    manualAttendanceAllowed: false,
    pinAttendanceAllowed: false,
    attachments: [],
    status: 'completed',
    createdAt: validEvent.startsAt,
    updatedAt: validEvent.endsAt,
  } satisfies EventSummary;
  const analytics = {
    eventId,
    invited: 100,
    registered: 80,
    attended: 75,
    absent: 20,
    late: 5,
    excused: 5,
    rejected: 0,
    pending: 0,
    attendanceRate: 75,
    mandatoryCompliance: 80,
    verificationMethods: [{ method: 'dynamic_qr', count: 75 }],
    checkInTimeline: [{ period: '2026-08-10T09:00', count: 75 }],
    attendanceOverTime: [{ period: '2026-08-10T09:00', attended: 75, attendanceRate: 75 }],
    attendanceByInstitutionUnit: [],
    attendanceByProgramme: [],
    attendanceByLevel: [],
    attendanceByRole: [],
    verificationFailures: {
      gps: 0,
      face: 0,
      credential: 0,
      duplicate: 0,
      suspicious: 0,
      total: 0,
    },
    eventComparison: [],
    semesterParticipation: [],
    generatedAt: validEvent.endsAt,
  } satisfies EventAnalytics;

  void it('creates CSV, Excel, and PDF analytics artifacts', async () => {
    const branding = {
      institutionName: 'Attendity University',
      logo: {
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        mimeType: 'image/png' as const,
      },
    };
    assert.match(eventExportService.csv(event, analytics).toString('utf8'), /Attendance rate/);
    const xlsx = await eventExportService.excel(event, analytics, branding);
    assert.ok(xlsx.length > 1000);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(xlsx as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    assert.ok((workbook.getWorksheet('Event Analytics')?.getImages().length ?? 0) >= 1);
    const pdf = await eventExportService.pdf(event, analytics, branding);
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.ok((pdf.toString('latin1').match(/\/Subtype\s*\/Image/g)?.length ?? 0) >= 1);
  });
});
