import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RequestActor } from '@qr/types';
import {
  attendanceCheckInSchema,
  clearanceLookupSchema,
  createAttendanceSessionSchema,
} from '../src/validators/attendance.validator.js';

process.env.MONGODB_URI = 'mongodb://localhost:27017/attendity_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const actor = (role: RequestActor['role']): RequestActor => ({
  id: '507f1f77bcf86cd799439011',
  universityId: '507f191e810c19729de860ea',
  email: `${role}@example.edu`,
  fullName: 'Portal Test User',
  role,
  sessionId: 'test-session',
  permissions: [],
});

void describe('attendance request validation', () => {
  void it('accepts bounded session windows and rejects unsafe durations', () => {
    assert.equal(
      createAttendanceSessionSchema.safeParse({
        body: { courseId: '507f1f77bcf86cd799439011', durationMinutes: 15 },
      }).success,
      true,
    );
    for (const durationMinutes of [4, 181])
      assert.equal(
        createAttendanceSessionSchema.safeParse({
          body: { courseId: '507f1f77bcf86cd799439011', durationMinutes },
        }).success,
        false,
      );
    assert.equal(
      createAttendanceSessionSchema.safeParse({
        body: {
          courseId: '507f1f77bcf86cd799439011',
          durationMinutes: 180,
          qrMode: 'static',
        },
      }).success,
      true,
    );
    assert.equal(
      createAttendanceSessionSchema.safeParse({
        body: { courseId: '507f1f77bcf86cd799439011', qrMode: 'permanent' },
      }).success,
      false,
    );
  });

  void it('normalizes QR check-in codes and validates clearance identifiers', () => {
    const checkIn = attendanceCheckInSchema.safeParse({ body: { code: '  abcdef12  ' } });
    assert.equal(checkIn.success, true);
    if (checkIn.success) assert.equal(checkIn.data.body.code, 'ABCDEF12');
    assert.equal(
      clearanceLookupSchema.safeParse({ params: { registrationNumber: 'STU-2026-001' } }).success,
      true,
    );
  });

  void it('requires venue coordinates for GPS sessions and rejects client biometric claims', () => {
    assert.equal(
      createAttendanceSessionSchema.safeParse({
        body: {
          courseId: '507f1f77bcf86cd799439011',
          gpsRequired: true,
        },
      }).success,
      false,
    );
    assert.equal(
      attendanceCheckInSchema.safeParse({
        body: {
          code: 'ABCDEF12',
          faceVerification: { verified: true, confidence: 1, provider: 'browser' },
        },
      }).success,
      false,
    );
  });

  void it('applies validated defaults to the Express request', async () => {
    const { validate } = await import('../src/middlewares/validate.middleware.js');
    const request = {
      body: { courseId: '507f1f77bcf86cd799439011' },
      params: {},
      query: {},
      headers: {},
    };
    let error: unknown = new Error('next was not called');
    validate(createAttendanceSessionSchema)(request as never, {} as never, (received?: unknown) => {
      error = received;
    });
    assert.equal(error, undefined);
    assert.deepEqual(request.body, {
      courseId: '507f1f77bcf86cd799439011',
      durationMinutes: 15,
      qrMode: 'rotating',
      qrRotationSeconds: 60,
      gpsRequired: false,
      maximumRadiusMetres: 50,
      faceVerificationRequired: false,
    });
  });
});

void describe('attendance model invariants', () => {
  void it('prevents duplicate student check-ins for a session', async () => {
    const { AttendanceRecordModel } = await import('../src/models/attendance-record.model.js');
    const index = AttendanceRecordModel.schema
      .indexes()
      .find(
        ([fields]) => fields.universityId === 1 && fields.sessionId === 1 && fields.studentId === 1,
      );
    assert.ok(index);
    assert.equal(index[1].unique, true);
  });

  void it('keeps check-in codes private by default and tenant-unique', async () => {
    const { AttendanceSessionModel } = await import('../src/models/attendance-session.model.js');
    assert.equal(AttendanceSessionModel.schema.path('checkInCode').options.select, false);
    const index = AttendanceSessionModel.schema
      .indexes()
      .find(([fields]) => fields.universityId === 1 && fields.checkInCode === 1);
    assert.ok(index);
    assert.equal(index[1].unique, true);
    assert.equal(AttendanceSessionModel.schema.path('qrNonce').options.select, false);
    assert.equal(AttendanceSessionModel.schema.path('qrNonceHash').options.select, false);
    assert.equal(AttendanceSessionModel.schema.path('staticQrToken').options.select, false);
    assert.equal(AttendanceSessionModel.schema.path('qrMode')?.options.default, 'rotating');
    const serialized = new AttendanceSessionModel({
      checkInCode: 'ABCDEF1234567890',
      qrNonce: 'a-secure-random-nonce-value',
      qrNonceHash: 'a'.repeat(64),
    }).toJSON();
    assert.equal('checkInCode' in serialized, false);
    assert.equal('qrNonce' in serialized, false);
    assert.equal('qrNonceHash' in serialized, false);
    assert.equal('staticQrToken' in serialized, false);
  });

  void it('redacts request fingerprint data from attendance responses', async () => {
    const { AttendanceRecordModel } = await import('../src/models/attendance-record.model.js');
    assert.equal(AttendanceRecordModel.schema.path('ipAddress').options.select, false);
    assert.equal(AttendanceRecordModel.schema.path('userAgent').options.select, false);
    const serialized = new AttendanceRecordModel({
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    }).toJSON();
    assert.equal('ipAddress' in serialized, false);
    assert.equal('userAgent' in serialized, false);
  });

  void it('stores biometric provider references privately and tenant-uniquely', async () => {
    const { FaceProfileModel } = await import('../src/models/face-profile.model.js');
    assert.equal(FaceProfileModel.schema.path('providerReference').options.select, false);
    const index = FaceProfileModel.schema
      .indexes()
      .find(([fields]) => fields.universityId === 1 && fields.studentId === 1);
    assert.ok(index);
    assert.equal(index[1].unique, true);
  });
});

void describe('dynamic QR and GPS security', () => {
  void it('reuses a stored encrypted credential for static sessions only', async () => {
    const { attendanceService } = await import('../src/services/attendance.service.js');
    const session = {
      _id: 'session-1',
      universityId: 'university-1',
      contextType: 'CLASS_SESSION' as const,
      courseId: 'course-1',
      lecturerId: 'lecturer-1',
      ownerId: 'lecturer-1',
      qrMode: 'static' as const,
      qrRotatedAt: new Date('2099-08-10T10:00:00.000Z'),
      qrRotationSeconds: 30,
      closesAt: new Date('2099-08-10T13:00:00.000Z'),
      qrNonce: 'a-static-secure-random-nonce',
      staticQrToken: 'v1.persisted-static-credential',
    };
    const qrToken = (
      attendanceService as unknown as { qrToken(value: typeof session): string }
    ).qrToken.bind(attendanceService);

    assert.equal(qrToken(session), 'v1.persisted-static-credential');
    assert.equal(qrToken(session), 'v1.persisted-static-credential');
    assert.notEqual(qrToken({ ...session, qrMode: 'rotating' }), session.staticQrToken);
    assert.notEqual(
      qrToken({ ...session, staticQrToken: `v1.${'legacy'.repeat(80)}` }),
      `v1.${'legacy'.repeat(80)}`,
    );
  });

  void it('keeps static QR credentials valid for the complete check-in window', async () => {
    const [{ attendanceService }, { verifyQrToken }] = await Promise.all([
      import('../src/services/attendance.service.js'),
      import('../src/services/qr-token.service.js'),
    ]);
    const openedAt = new Date('2099-08-10T10:00:00.000Z');
    const closesAt = new Date('2099-08-10T13:00:00.000Z');
    const qrToken = (
      attendanceService as unknown as {
        qrToken(session: {
          _id: string;
          universityId: string;
          contextType: 'CLASS_SESSION';
          courseId: string;
          lecturerId: string;
          ownerId: string;
          qrMode: 'static';
          qrRotatedAt: Date;
          qrRotationSeconds: number;
          closesAt: Date;
          qrNonce: string;
        }): string;
      }
    ).qrToken({
      _id: 'session-1',
      universityId: 'university-1',
      contextType: 'CLASS_SESSION',
      courseId: 'course-1',
      lecturerId: 'lecturer-1',
      ownerId: 'lecturer-1',
      qrMode: 'static',
      qrRotatedAt: openedAt,
      qrRotationSeconds: 30,
      closesAt,
      qrNonce: 'a-static-secure-random-nonce',
    });

    assert.equal(verifyQrToken(qrToken).expiresAt, closesAt.getTime());
  });

  void it('emits one compact canonical credential for a real static class session', async () => {
    const [{ attendanceService }, { verifyQrToken }] = await Promise.all([
      import('../src/services/attendance.service.js'),
      import('../src/services/qr-token.service.js'),
    ]);
    const openedAt = new Date('2099-08-10T10:00:00.000Z');
    const closesAt = new Date('2099-08-10T13:00:00.000Z');
    const qrToken = (
      attendanceService as unknown as {
        qrToken(session: {
          _id: string;
          universityId: string;
          contextType: 'CLASS_SESSION';
          courseId: string;
          lecturerId: string;
          ownerId: string;
          qrMode: 'static';
          qrRotatedAt: Date;
          qrRotationSeconds: number;
          closesAt: Date;
          qrNonce: string;
        }): string;
      }
    ).qrToken({
      _id: '507f1f77bcf86cd799439011',
      universityId: '507f1f77bcf86cd799439012',
      contextType: 'CLASS_SESSION',
      courseId: '507f1f77bcf86cd799439013',
      lecturerId: '507f1f77bcf86cd799439014',
      ownerId: '507f1f77bcf86cd799439014',
      qrMode: 'static',
      qrRotatedAt: openedAt,
      qrRotationSeconds: 60,
      closesAt,
      qrNonce: '01234567890123456789012345678901',
    });

    assert.ok(
      qrToken.length <= 350,
      `Expected a camera-friendly token, received ${qrToken.length}`,
    );
    assert.deepEqual(verifyQrToken(qrToken), {
      sessionId: '507f1f77bcf86cd799439011',
      universityId: '507f1f77bcf86cd799439012',
      contextType: 'CLASS_SESSION',
      contextId: '507f1f77bcf86cd799439013',
      ownerId: '507f1f77bcf86cd799439014',
      issuedAt: openedAt.getTime(),
      expiresAt: closesAt.getTime(),
      nonce: '01234567890123456789012345678901',
    });
  });

  void it('round-trips signed encrypted QR payloads and rejects tampering', async () => {
    const { createQrToken, verifyQrToken } = await import('../src/services/qr-token.service.js');
    const payload = {
      sessionId: 'session-1',
      universityId: 'university-1',
      courseId: 'course-1',
      lecturerId: 'lecturer-1',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      nonce: 'a-secure-random-nonce-value',
    };
    const token = createQrToken(payload);
    assert.deepEqual(verifyQrToken(token), payload);
    const parts = token.split('.');
    const encrypted = parts[3] ?? '';
    parts[3] = `${encrypted.startsWith('A') ? 'B' : 'A'}${encrypted.slice(1)}`;
    const tampered = parts.join('.');
    assert.throws(() => verifyQrToken(tampered), /signature/i);
  });

  void it('keeps encrypted class credentials dense enough for reliable camera scanning', async () => {
    const { createQrToken, verifyQrToken } = await import('../src/services/qr-token.service.js');
    const payload = {
      sessionId: '507f1f77bcf86cd799439011',
      universityId: '507f1f77bcf86cd799439012',
      contextType: 'CLASS_SESSION' as const,
      contextId: '507f1f77bcf86cd799439013',
      ownerId: '507f1f77bcf86cd799439014',
      issuedAt: new Date('2099-08-10T10:00:00.000Z').getTime(),
      expiresAt: new Date('2099-08-10T13:00:00.000Z').getTime(),
      nonce: '01234567890123456789012345678901',
    };

    const token = createQrToken(payload);

    assert.ok(token.length <= 350, `Expected a camera-friendly token, received ${token.length}`);
    assert.deepEqual(verifyQrToken(token), payload);
  });

  void it('rejects expired QR payloads and calculates venue distance', async () => {
    const [{ createQrToken, verifyQrToken }, { calculateDistanceMetres }] = await Promise.all([
      import('../src/services/qr-token.service.js'),
      import('../src/services/attendance.service.js'),
    ]);
    const token = createQrToken({
      sessionId: 'session-1',
      universityId: 'university-1',
      courseId: 'course-1',
      lecturerId: 'lecturer-1',
      issuedAt: Date.now() - 60_000,
      expiresAt: Date.now() - 1,
      nonce: 'another-secure-random-nonce',
    });
    assert.throws(() => verifyQrToken(token), /expired/i);
    assert.equal(calculateDistanceMetres(9.0765, 7.3986, 9.0765, 7.3986), 0);
    assert.ok(calculateDistanceMetres(9.0765, 7.3986, 9.0775, 7.3986) > 100);
  });
});

void describe('portal role boundaries', () => {
  void it('blocks non-lecturers from opening sessions', async () => {
    const { attendanceService } = await import('../src/services/attendance.service.js');
    await assert.rejects(
      attendanceService.createSession(actor('university_admin'), actor('student').id, 15),
      (error: Error & { statusCode?: number }) => error.statusCode === 403,
    );
  });

  void it('blocks non-students from checking in', async () => {
    const { attendanceService } = await import('../src/services/attendance.service.js');
    await assert.rejects(
      attendanceService.checkIn(actor('lecturer'), 'ABCDEF12'),
      (error: Error & { statusCode?: number }) => error.statusCode === 403,
    );
  });
});

void describe('static QR export', () => {
  void it('generates a branded PDF containing the complete check-in window', async () => {
    const { renderStaticAttendanceQrPdf } =
      await import('../src/services/attendance-qr-export.service.js');
    const pdf = await renderStaticAttendanceQrPdf({
      checkInWindow: '10 August 2099, 10:00 – 13:00',
      course: 'CSC 401 — Systems Analysis',
      institution: 'Lagos Metropolitan University',
      lecturer: 'Dr Ada Okafor',
      qrToken: 'attendance-token-for-static-export',
      reportId: 'ATD-QR-STATIC-001',
      logo: {
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
        mimeType: 'image/png',
      },
    });

    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.ok(pdf.length > 1_000);
    const withoutLogo = await renderStaticAttendanceQrPdf({
      checkInWindow: '10 August 2099, 10:00 – 13:00',
      course: 'CSC 401 — Systems Analysis',
      institution: 'Lagos Metropolitan University',
      lecturer: 'Dr Ada Okafor',
      qrToken: 'attendance-token-for-static-export',
      reportId: 'ATD-QR-STATIC-001',
    });
    assert.notEqual(pdf.length, withoutLogo.length);
  });
});
