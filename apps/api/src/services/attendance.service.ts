import { randomBytes } from 'node:crypto';
import type { AttendanceQrMode, RequestActor } from '@qr/types';
import { AttendanceRecordModel } from '../models/attendance-record.model.js';
import { AttendanceSessionModel } from '../models/attendance-session.model.js';
import { CourseModel } from '../models/course.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { EventRegistrationModel } from '../models/event-registration.model.js';
import { UserModel } from '../models/user.model.js';
import { auditService } from './audit.service.js';
import { socketService } from '../socket/socket.service.js';
import { faceVerificationService } from './face-verification.service.js';
import { createQrToken, hashQrNonce, verifyQrToken } from './qr-token.service.js';
import { analyticsService } from './analytics.service.js';
import { notificationService } from './notification.service.js';
import { lecturerAssignmentService } from './lecturer-assignment.service.js';
import { clearanceService } from './clearance.service.js';
import { eventNotificationService } from './event-notification.service.js';
import { renderStaticAttendanceQrPdf } from './attendance-qr-export.service.js';
import { trustedMediaService } from './trusted-media.service.js';
import { settingsService } from './settings.service.js';

interface CourseView {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly attendanceRequirement: number;
}

interface ProgressView extends CourseView {
  readonly sessionsHeld: number;
  readonly sessionsAttended: number;
  readonly attendancePercentage: number;
  readonly eligible: boolean;
}

interface AttendanceCredential {
  readonly code?: string;
  readonly token?: string;
}

interface CheckInInput extends AttendanceCredential {
  readonly gps?: {
    readonly latitude: number;
    readonly longitude: number;
    readonly accuracy: number;
  };
  readonly imageCapture?: string;
}

interface EventCheckInInput extends CheckInInput {
  readonly pin?: string;
}

interface QrTokenSession {
  readonly _id: unknown;
  readonly universityId: unknown;
  readonly contextType?: 'CLASS_SESSION' | 'EVENT_SESSION';
  readonly courseId?: unknown;
  readonly eventId?: unknown;
  readonly lecturerId?: unknown;
  readonly ownerId?: unknown;
  readonly qrMode?: AttendanceQrMode;
  readonly qrRotatedAt: Date;
  readonly qrRotationSeconds: number;
  readonly closesAt: Date;
  readonly qrNonce: string;
  readonly staticQrToken?: string | null;
}

const MAX_CAMERA_FRIENDLY_QR_TOKEN_LENGTH = 350;

function id(value: unknown): string {
  return String(value);
}
export function calculateDistanceMetres(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const radius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function courseView(course: {
  readonly _id: unknown;
  readonly code: string;
  readonly title: string;
  readonly attendanceRequirement: number;
}): CourseView {
  return {
    id: id(course._id),
    code: course.code,
    title: course.title,
    attendanceRequirement: course.attendanceRequirement,
  };
}

export class AttendanceService {
  private async closeExpired(universityId: string): Promise<void> {
    await AttendanceSessionModel.updateMany(
      { universityId, status: 'open', closesAt: { $lte: new Date() } },
      { $set: { status: 'closed', closedAt: new Date() } },
    ).exec();
  }

  private async progress(
    universityId: string,
    studentId: string,
    course: {
      readonly _id: unknown;
      readonly code: string;
      readonly title: string;
      readonly attendanceRequirement: number;
    },
  ): Promise<ProgressView> {
    const closedSessions = await AttendanceSessionModel.find({
      universityId,
      courseId: course._id,
      status: 'closed',
    })
      .select('_id')
      .lean()
      .exec();
    const sessionIds = closedSessions.map((session) => session._id);
    const sessionsAttended = sessionIds.length
      ? await AttendanceRecordModel.countDocuments({
          universityId,
          studentId,
          sessionId: { $in: sessionIds },
        })
      : 0;
    const attendancePercentage = sessionIds.length
      ? Math.round((sessionsAttended / sessionIds.length) * 100)
      : 0;
    return {
      ...courseView(course),
      sessionsHeld: sessionIds.length,
      sessionsAttended,
      attendancePercentage,
      eligible: sessionIds.length > 0 && attendancePercentage >= course.attendanceRequirement,
    };
  }

  private qrToken(session: QrTokenSession): string {
    if (
      session.qrMode === 'static' &&
      session.staticQrToken &&
      session.staticQrToken.length <= MAX_CAMERA_FRIENDLY_QR_TOKEN_LENGTH
    )
      return session.staticQrToken;
    return createQrToken({
      sessionId: id(session._id),
      universityId: id(session.universityId),
      contextType: session.contextType ?? 'CLASS_SESSION',
      contextId: id(session.contextType === 'EVENT_SESSION' ? session.eventId : session.courseId),
      ownerId: id(session.ownerId ?? session.lecturerId),
      issuedAt: session.qrRotatedAt.getTime(),
      expiresAt:
        session.qrMode === 'static'
          ? session.closesAt.getTime()
          : Math.min(
              session.closesAt.getTime(),
              session.qrRotatedAt.getTime() + session.qrRotationSeconds * 1000,
            ),
      nonce: session.qrNonce,
    });
  }

  private async stableQrToken(session: QrTokenSession): Promise<string> {
    if ((session.qrMode ?? 'rotating') !== 'static') return this.qrToken(session);
    if (
      session.staticQrToken &&
      session.staticQrToken.length <= MAX_CAMERA_FRIENDLY_QR_TOKEN_LENGTH
    )
      return session.staticQrToken;
    const token = this.qrToken(session);
    const updated = await AttendanceSessionModel.findOneAndUpdate(
      {
        _id: session._id,
        status: 'open',
        $or: [
          { staticQrToken: { $exists: false } },
          { staticQrToken: null },
          ...(session.staticQrToken ? [{ staticQrToken: session.staticQrToken }] : []),
        ],
      },
      { $set: { staticQrToken: token } },
      { new: true },
    )
      .select('+staticQrToken')
      .lean()
      .exec();
    if (updated?.staticQrToken) return updated.staticQrToken;
    const current = await AttendanceSessionModel.findById(session._id)
      .select('+staticQrToken')
      .lean()
      .exec();
    if (current?.staticQrToken) return current.staticQrToken;
    throw Object.assign(new Error('The static QR credential could not be prepared.'), {
      statusCode: 500,
    });
  }

  private async activeSession(actor: RequestActor, credential: AttendanceCredential) {
    if (credential.token) {
      const payload = verifyQrToken(credential.token);
      if (payload.universityId !== actor.universityId)
        throw Object.assign(new Error('The QR token belongs to another institution.'), {
          statusCode: 403,
        });
      const session = await AttendanceSessionModel.findOne({
        _id: payload.sessionId,
        universityId: actor.universityId,
        status: 'open',
        closesAt: { $gt: new Date() },
      })
        .select('+checkInCode +qrNonce +qrNonceHash')
        .exec();
      const tokenMatchesSession =
        session &&
        (payload.contextType ?? 'CLASS_SESSION') === session.contextType &&
        (payload.contextId ?? payload.courseId ?? payload.eventId) ===
          id(session.contextType === 'EVENT_SESSION' ? session.eventId : session.courseId) &&
        (payload.ownerId ?? payload.lecturerId) === id(session.ownerId ?? session.lecturerId) &&
        hashQrNonce(payload.nonce) === session.qrNonceHash;
      if (!tokenMatchesSession)
        throw Object.assign(new Error('The QR token is invalid or has been replaced.'), {
          statusCode: 422,
        });
      return session;
    }
    const code = credential.code?.trim().toUpperCase();
    if (!code)
      throw Object.assign(new Error('A QR token or check-in code is required.'), {
        statusCode: 422,
      });
    const session = await AttendanceSessionModel.findOne({
      universityId: actor.universityId,
      checkInCode: code,
      status: 'open',
      closesAt: { $gt: new Date() },
    })
      .select('+checkInCode +qrNonce +qrNonceHash +staticQrToken')
      .exec();
    if (!session)
      throw Object.assign(new Error('The check-in code is invalid or has expired.'), {
        statusCode: 422,
      });
    return session;
  }

  private async verificationFactors(
    actor: RequestActor,
    session: {
      readonly gpsRequired: boolean;
      readonly latitude?: number | null;
      readonly longitude?: number | null;
      readonly maximumRadiusMetres: number;
      readonly faceVerificationRequired: boolean;
    },
    values: Pick<EventCheckInInput, 'gps' | 'imageCapture'>,
  ) {
    let gpsResult: Record<string, unknown> | undefined;
    if (session.gpsRequired) {
      if (!values.gps || session.latitude == null || session.longitude == null)
        throw Object.assign(new Error('GPS verification is required.'), { statusCode: 422 });
      const distance = calculateDistanceMetres(
        session.latitude,
        session.longitude,
        values.gps.latitude,
        values.gps.longitude,
      );
      if (distance > session.maximumRadiusMetres)
        throw Object.assign(new Error('You are outside the attendance venue.'), {
          statusCode: 422,
        });
      gpsResult = { ...values.gps, distanceMetres: Math.round(distance), verified: true };
    }
    const faceResult = session.faceVerificationRequired
      ? await faceVerificationService.verify(
          actor,
          values.imageCapture ??
            (() => {
              throw Object.assign(new Error('A live face capture is required.'), {
                statusCode: 422,
              });
            })(),
        )
      : undefined;
    return { gpsResult, faceResult };
  }

  async lecturerWorkspace(actor: RequestActor) {
    await this.closeExpired(actor.universityId);
    const rotationCutoff = new Date();
    const rotating = await AttendanceSessionModel.find({
      universityId: actor.universityId,
      lecturerId: actor.id,
      status: 'open',
      qrMode: { $ne: 'static' },
    })
      .select('+checkInCode +qrNonce +qrNonceHash')
      .exec();
    await Promise.all(
      rotating.map(async (session) => {
        if (
          rotationCutoff.getTime() - session.qrRotatedAt.getTime() >=
          session.qrRotationSeconds * 1000
        ) {
          const qrNonce = randomBytes(16).toString('base64url');
          const rotated = await AttendanceSessionModel.findOneAndUpdate(
            { _id: session._id, status: 'open', qrRotatedAt: session.qrRotatedAt },
            {
              $set: {
                checkInCode: randomBytes(16).toString('hex').toUpperCase(),
                qrRotatedAt: rotationCutoff,
                qrNonce,
                qrNonceHash: hashQrNonce(qrNonce),
                updatedBy: actor.id,
              },
            },
            { new: true },
          )
            .select('+checkInCode +qrNonce +qrNonceHash')
            .exec();
          if (!rotated) return;
          await auditService.record({
            action: 'attendance_session.qr_rotated',
            resourceType: 'attendance_session',
            resourceId: rotated.id,
            actor,
            newValue: { rotatedAt: rotationCutoff },
          });
          socketService.emitToUniversity(actor.universityId, 'attendance:qr-updated', {
            sessionId: rotated.id,
            rotatedAt: rotationCutoff,
          });
        }
      }),
    );
    const assignedCourseIds = await lecturerAssignmentService.activeCourseIds(actor, new Date());
    const courses = await CourseModel.find({
      universityId: actor.universityId,
      _id: { $in: assignedCourseIds },
      status: 'active',
    })
      .select('code title attendanceRequirement')
      .sort({ code: 1 })
      .lean()
      .exec();
    const sessions = await AttendanceSessionModel.find({
      universityId: actor.universityId,
      lecturerId: actor.id,
    })
      .select('+checkInCode +qrNonce +qrNonceHash +staticQrToken')
      .populate('courseId', 'code title')
      .sort({ openedAt: -1 })
      .limit(50)
      .lean()
      .exec();
    const sessionViews = await Promise.all(
      sessions.map(async (session) => ({
        id: id(session._id),
        course: session.courseId,
        openedAt: session.openedAt,
        closesAt: session.closesAt,
        closedAt: session.closedAt,
        status: session.status,
        checkInCode: session.status === 'open' ? session.checkInCode : undefined,
        qrToken: session.status === 'open' ? await this.stableQrToken(session) : undefined,
        qrMode: session.qrMode ?? 'rotating',
        qrRotatedAt: session.qrRotatedAt,
        qrRotationSeconds: session.qrRotationSeconds,
        gpsRequired: session.gpsRequired,
        faceVerificationRequired: session.faceVerificationRequired,
        attendanceCount: await AttendanceRecordModel.countDocuments({
          universityId: actor.universityId,
          sessionId: session._id,
        }),
      })),
    );
    return { courses: courses.map(courseView), sessions: sessionViews };
  }

  async createSession(
    actor: RequestActor,
    input:
      | {
          courseId: string;
          durationMinutes: number;
          qrMode: AttendanceQrMode;
          qrRotationSeconds: number;
          gpsRequired: boolean;
          latitude?: number;
          longitude?: number;
          maximumRadiusMetres: number;
          faceVerificationRequired: boolean;
        }
      | string,
    legacyDuration = 15,
  ) {
    const values =
      typeof input === 'string'
        ? {
            courseId: input,
            durationMinutes: legacyDuration,
            qrMode: 'rotating' as const,
            qrRotationSeconds: 60,
            gpsRequired: false,
            maximumRadiusMetres: 50,
            faceVerificationRequired: false,
          }
        : input;
    if (actor.role !== 'lecturer')
      throw Object.assign(new Error('Only lecturers can open attendance sessions.'), {
        statusCode: 403,
      });
    if (values.faceVerificationRequired) faceVerificationService.assertConfigured();
    await this.closeExpired(actor.universityId);
    await lecturerAssignmentService.assertActiveAssignment(actor, values.courseId, new Date());
    const course = await CourseModel.findOne({
      _id: values.courseId,
      universityId: actor.universityId,
      status: 'active',
    })
      .select('_id code title')
      .lean()
      .exec();
    if (!course)
      throw Object.assign(new Error('This course is not assigned to the current lecturer.'), {
        statusCode: 403,
      });
    const existing = await AttendanceSessionModel.exists({
      universityId: actor.universityId,
      lecturerId: actor.id,
      status: 'open',
    });
    if (existing)
      throw Object.assign(new Error('You already have an open attendance session.'), {
        statusCode: 409,
      });

    const checkInCode = randomBytes(8).toString('hex').toUpperCase();
    const qrNonce = randomBytes(16).toString('base64url');
    const openedAt = new Date();
    const session = await AttendanceSessionModel.create({
      contextType: 'CLASS_SESSION',
      courseId: values.courseId,
      lecturerId: actor.id,
      ownerId: actor.id,
      openedAt,
      closesAt: new Date(openedAt.getTime() + values.durationMinutes * 60_000),
      status: 'open',
      checkInCode,
      qrMode: values.qrMode,
      qrRotationSeconds: values.qrRotationSeconds,
      qrRotatedAt: openedAt,
      qrNonce,
      qrNonceHash: hashQrNonce(qrNonce),
      gpsRequired: values.gpsRequired,
      latitude: values.latitude,
      longitude: values.longitude,
      maximumRadiusMetres: values.maximumRadiusMetres,
      faceVerificationRequired: values.faceVerificationRequired,
      universityId: actor.universityId,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    const staticQrToken = values.qrMode === 'static' ? this.qrToken(session) : undefined;
    if (staticQrToken) {
      session.set('staticQrToken', staticQrToken);
      await session.save();
    }
    await auditService.record({
      action: 'attendance_session.opened',
      resourceType: 'attendance_session',
      resourceId: session.id,
      actor,
      newValue: session.toJSON(),
    });
    socketService.emitToUniversity(actor.universityId, 'attendance:session-created', {
      sessionId: session.id,
      courseId: values.courseId,
    });
    socketService.emitToUniversity(actor.universityId, 'analytics:updated', {
      reason: 'session-created',
      courseId: values.courseId,
    });
    await notificationService.create({
      universityId: actor.universityId,
      recipientId: actor.id,
      title: 'Attendance session started',
      body: `${course.code} — ${course.title} is live and accepting verified check-ins.`,
      category: 'session_started',
      priority: 'normal',
      metadata: { sessionId: session.id, courseId: values.courseId },
    });
    return {
      ...session.toJSON(),
      checkInCode,
      qrToken: staticQrToken ?? this.qrToken(session),
      course: { id: id(course._id), code: course.code, title: course.title },
    };
  }

  async closeSession(actor: RequestActor, sessionId: string) {
    const existing = await AttendanceSessionModel.findOne({
      _id: sessionId,
      universityId: actor.universityId,
      lecturerId: actor.id,
    }).exec();
    if (!existing)
      throw Object.assign(new Error('Attendance session was not found.'), { statusCode: 404 });
    if (existing.status === 'closed') return existing.toJSON();
    const session = await AttendanceSessionModel.findOneAndUpdate(
      {
        _id: sessionId,
        universityId: actor.universityId,
        lecturerId: actor.id,
        status: 'open',
      },
      { $set: { status: 'closed', closedAt: new Date(), updatedBy: actor.id } },
      { new: true },
    ).exec();
    if (!session) {
      const closed = await AttendanceSessionModel.findOne({
        _id: sessionId,
        universityId: actor.universityId,
        lecturerId: actor.id,
      }).exec();
      if (!closed)
        throw Object.assign(new Error('Attendance session was not found.'), { statusCode: 404 });
      return closed.toJSON();
    }
    await auditService.record({
      action: 'attendance_session.closed',
      resourceType: 'attendance_session',
      resourceId: session.id,
      actor,
      newValue: session.toJSON(),
    });
    socketService.emitToUniversity(actor.universityId, 'attendance:session-closed', {
      sessionId: session.id,
    });
    socketService.emitToUniversity(actor.universityId, 'analytics:updated', {
      reason: 'session-closed',
      courseId: id(session.courseId),
    });
    const [course, riskRows] = await Promise.all([
      CourseModel.findOne({
        _id: session.courseId,
        universityId: actor.universityId,
      })
        .select('code title')
        .lean()
        .exec(),
      analyticsService.courseRisks(actor, id(session.courseId)),
    ]);
    const attendanceCount = await AttendanceRecordModel.countDocuments({
      universityId: actor.universityId,
      sessionId: session.id,
    });
    const courseLabel = course ? `${course.code} — ${course.title}` : 'The attendance session';
    const riskStudents = riskRows.filter(
      (risk) => risk.level === 'high' || risk.level === 'critical',
    );
    await Promise.all([
      clearanceService.expireForCourse(actor, id(session.courseId)),
      notificationService.create({
        universityId: actor.universityId,
        recipientId: actor.id,
        title: 'Attendance session completed',
        body: `${courseLabel} closed with ${attendanceCount} verified check-in${attendanceCount === 1 ? '' : 's'} and ${riskStudents.length} at-risk registration${riskStudents.length === 1 ? '' : 's'}.`,
        category: 'attendance_completed',
        priority: riskStudents.length ? 'high' : 'normal',
        metadata: { sessionId: session.id, courseId: id(session.courseId), attendanceCount },
      }),
      notificationService.createMany(
        riskStudents.map((risk) => ({
          universityId: actor.universityId,
          recipientId: risk.studentId,
          title: `${risk.courseCode} attendance risk: ${risk.level}`,
          body: `${risk.reason} ${risk.recommendation}`,
          category: 'risk_alert',
          priority: risk.level === 'critical' ? ('urgent' as const) : ('high' as const),
          metadata: {
            courseId: risk.courseId,
            currentAttendance: risk.currentAttendance,
            projectedAttendance: risk.projectedAttendance,
            requiredAttendance: risk.requiredAttendance,
            riskLevel: risk.level,
          },
        })),
      ),
    ]);
    return session.toJSON();
  }

  async staticQrPdf(actor: RequestActor, sessionId: string) {
    if (actor.role !== 'lecturer')
      throw Object.assign(new Error('Only lecturers can export class attendance QR codes.'), {
        statusCode: 403,
      });
    await this.closeExpired(actor.universityId);
    const session = await AttendanceSessionModel.findOne({
      _id: sessionId,
      universityId: actor.universityId,
      lecturerId: actor.id,
    })
      .select('+checkInCode +qrNonce +qrNonceHash +staticQrToken')
      .exec();
    if (!session)
      throw Object.assign(new Error('Attendance session was not found.'), { statusCode: 404 });
    if (session.status !== 'open' || session.closesAt <= new Date())
      throw Object.assign(new Error('Only an open attendance session can be exported.'), {
        statusCode: 409,
      });
    if ((session.qrMode ?? 'rotating') !== 'static')
      throw Object.assign(new Error('Rotating QR codes are digital-display only.'), {
        statusCode: 409,
      });
    const [course, settings] = await Promise.all([
      CourseModel.findOne({
        _id: session.courseId,
        universityId: actor.universityId,
      })
        .select('code title')
        .lean()
        .exec(),
      settingsService.get(actor),
    ]);
    if (!course)
      throw Object.assign(new Error('The session course was not found.'), { statusCode: 404 });
    const formatter = new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: settings.timeZone,
    });
    const reportId = `ATD-QR-${String(session._id).toUpperCase()}`;
    const logo = await trustedMediaService.resolveImage({
      universityId: actor.universityId,
      ...(settings.logoAssetId ? { assetId: settings.logoAssetId } : {}),
      ...(settings.logoUrl ? { snapshotUrl: settings.logoUrl } : {}),
      contexts: ['institution_logo'],
    });
    return {
      buffer: await renderStaticAttendanceQrPdf({
        checkInWindow: `${formatter.format(session.openedAt)} – ${formatter.format(session.closesAt)} (${settings.timeZone})`,
        course: `${course.code} — ${course.title}`,
        institution: settings.institutionName,
        lecturer: actor.fullName,
        qrToken: await this.stableQrToken(session),
        reportId,
        ...(logo ? { logo } : {}),
      }),
      fileName: `attendity-${course.code.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-attendance-qr.pdf`,
    };
  }

  async studentWorkspace(actor: RequestActor) {
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can access student attendance progress.'), {
        statusCode: 403,
      });
    await this.closeExpired(actor.universityId);
    const registrations = await CourseRegistrationModel.find({
      universityId: actor.universityId,
      studentId: actor.id,
      status: 'approved',
    })
      .select('courseId registrationNumber')
      .lean()
      .exec();
    const courses = await CourseModel.find({
      _id: { $in: registrations.map((registration) => registration.courseId) },
      universityId: actor.universityId,
    })
      .select('code title attendanceRequirement')
      .sort({ code: 1 })
      .lean()
      .exec();
    const records = await AttendanceRecordModel.find({
      universityId: actor.universityId,
      studentId: actor.id,
      contextType: { $ne: 'EVENT_SESSION' },
    })
      .populate('courseId', 'code title')
      .sort({ checkedInAt: -1 })
      .limit(365)
      .lean()
      .exec();
    const heatmap = records.reduce<Record<string, number>>((days, record) => {
      const day = record.checkedInAt.toISOString().slice(0, 10);
      if (day) days[day] = (days[day] ?? 0) + 1;
      return days;
    }, {});
    return {
      registrationNumber: registrations[0]?.registrationNumber ?? null,
      courses: await Promise.all(
        courses.map((course) => this.progress(actor.universityId, actor.id, course)),
      ),
      timeline: records.map((record) => ({
        id: id(record._id),
        course: record.courseId,
        checkedInAt: record.checkedInAt,
        status: record.status,
        gpsVerified: record.gps?.verified ?? false,
        faceVerified: record.faceVerification?.verified ?? false,
      })),
      heatmap,
      faceProfile: {
        configured: faceVerificationService.isConfigured(),
        enrolled: await faceVerificationService.hasProfile(actor),
      },
    };
  }

  async requirements(actor: RequestActor, credential: AttendanceCredential) {
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can prepare an attendance check-in.'), {
        statusCode: 403,
      });
    const session = await this.activeSession(actor, credential);
    return {
      gpsRequired: session.gpsRequired,
      faceVerificationRequired: session.faceVerificationRequired,
      faceProfileEnrolled: session.faceVerificationRequired
        ? await faceVerificationService.hasProfile(actor)
        : false,
      closesAt: session.closesAt,
    };
  }

  async enrolFace(actor: RequestActor, imageCapture: string) {
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can enrol a face profile.'), {
        statusCode: 403,
      });
    return faceVerificationService.enrol(actor, imageCapture);
  }

  async checkIn(
    actor: RequestActor,
    input: CheckInInput | string,
    context: { readonly ipAddress?: string; readonly userAgent?: string } = {},
  ) {
    const values = typeof input === 'string' ? { code: input } : input;
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can check in to attendance sessions.'), {
        statusCode: 403,
      });
    const session = await this.activeSession(actor, values);
    const { gpsResult, faceResult } = await this.verificationFactors(actor, session, values);
    const registration = await CourseRegistrationModel.exists({
      universityId: actor.universityId,
      studentId: actor.id,
      courseId: session.courseId,
      status: 'approved',
    });
    if (!registration)
      throw Object.assign(new Error('You are not registered for this course.'), {
        statusCode: 403,
      });
    const existing = await AttendanceRecordModel.exists({
      universityId: actor.universityId,
      sessionId: session.id,
      studentId: actor.id,
    });
    if (existing)
      throw Object.assign(new Error('Attendance has already been recorded for this session.'), {
        statusCode: 409,
      });
    const validatedSession = await this.activeSession(actor, values);
    if (validatedSession.id !== session.id)
      throw Object.assign(new Error('The attendance session changed during verification.'), {
        statusCode: 409,
      });
    let record;
    try {
      record = await AttendanceRecordModel.create({
        contextType: 'CLASS_SESSION',
        sessionId: validatedSession.id,
        courseId: validatedSession.courseId,
        studentId: actor.id,
        checkedInAt: new Date(),
        status: 'present',
        method: 'qr',
        verificationMethods: [
          'dynamic_qr',
          ...(gpsResult ? (['gps'] as const) : []),
          ...(faceResult ? (['face'] as const) : []),
        ],
        verificationStatus: 'verified',
        qrVerified: true,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        gps: gpsResult,
        faceVerification: faceResult,
        universityId: actor.universityId,
        createdBy: actor.id,
        updatedBy: actor.id,
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11_000)
        throw Object.assign(new Error('Attendance has already been recorded for this session.'), {
          statusCode: 409,
        });
      throw error;
    }
    await auditService.record({
      action: 'attendance.checked_in',
      resourceType: 'attendance_record',
      resourceId: record.id,
      actor,
      newValue: record.toJSON(),
      ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
      ...(context.userAgent ? { userAgent: context.userAgent } : {}),
    });
    socketService.emitToUniversity(actor.universityId, 'attendance:checked-in', {
      sessionId: session.id,
      studentId: actor.id,
      checkedInAt: record.checkedInAt,
    });
    socketService.emitToUniversity(actor.universityId, 'analytics:updated', {
      reason: 'attendance-recorded',
      courseId: id(session.courseId),
    });
    const checkedInCourse = await CourseModel.findOne({
      _id: session.courseId,
      universityId: actor.universityId,
    })
      .select('code title')
      .lean()
      .exec();
    await notificationService.create({
      universityId: actor.universityId,
      recipientId: actor.id,
      title: 'Attendance recorded',
      body: checkedInCourse
        ? `${checkedInCourse.code} — ${checkedInCourse.title} was recorded at ${record.checkedInAt.toLocaleTimeString('en-NG')}.`
        : `Your attendance was recorded at ${record.checkedInAt.toLocaleTimeString('en-NG')}.`,
      category: 'attendance_recorded',
      priority: 'normal',
      metadata: { sessionId: session.id, courseId: id(session.courseId), recordId: record.id },
    });
    return record.toJSON();
  }

  async createEventSession(
    actor: RequestActor,
    event: {
      readonly _id: unknown;
      readonly universityId: unknown;
      readonly organizerId: unknown;
      readonly title: string;
      readonly mandatory: boolean;
      readonly notificationChannels: readonly ('in_app' | 'email' | 'push' | 'sms')[];
      readonly status: string;
      readonly endsAt: Date;
      readonly attendanceMethods: readonly string[];
      readonly qrRotationSeconds: number;
      readonly gps?: {
        readonly latitude?: number | null;
        readonly longitude?: number | null;
        readonly maximumRadiusMetres?: number | null;
      } | null;
      readonly faceVerificationRequired: boolean;
      readonly manualAttendanceAllowed: boolean;
      readonly pinAttendanceAllowed: boolean;
      readonly attendancePinHash?: string | null;
    },
    durationMinutes: number,
  ) {
    const eventId = id(event._id);
    if (!['scheduled', 'active'].includes(event.status))
      throw Object.assign(new Error('Attendance can only open for a scheduled or active event.'), {
        statusCode: 409,
      });
    if (event.endsAt <= new Date())
      throw Object.assign(new Error('This event has already ended.'), { statusCode: 409 });
    if (event.faceVerificationRequired) faceVerificationService.assertConfigured();
    const existing = await AttendanceSessionModel.exists({
      universityId: actor.universityId,
      contextType: 'EVENT_SESSION',
      eventId,
      status: 'open',
      closesAt: { $gt: new Date() },
    });
    if (existing)
      throw Object.assign(new Error('This event already has an open attendance session.'), {
        statusCode: 409,
      });
    const openedAt = new Date();
    const closesAt = new Date(
      Math.min(event.endsAt.getTime(), openedAt.getTime() + durationMinutes * 60_000),
    );
    const checkInCode = randomBytes(8).toString('hex').toUpperCase();
    const qrNonce = randomBytes(16).toString('base64url');
    const dynamicQrEnabled = event.attendanceMethods.includes('dynamic_qr');
    const session = await AttendanceSessionModel.create({
      contextType: 'EVENT_SESSION',
      eventId,
      ownerId: actor.id,
      openedAt,
      closesAt,
      status: 'open',
      checkInCode,
      qrMode: 'rotating',
      qrRotationSeconds: event.qrRotationSeconds,
      qrRotatedAt: openedAt,
      qrNonce,
      qrNonceHash: hashQrNonce(qrNonce),
      dynamicQrEnabled,
      gpsRequired: event.attendanceMethods.includes('gps'),
      latitude: event.gps?.latitude,
      longitude: event.gps?.longitude,
      maximumRadiusMetres: event.gps?.maximumRadiusMetres ?? 100,
      faceVerificationRequired: event.faceVerificationRequired,
      manualAttendanceAllowed: event.manualAttendanceAllowed,
      pinAttendanceAllowed: event.pinAttendanceAllowed,
      attendancePinHash: event.attendancePinHash,
      universityId: actor.universityId,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.record({
      actor,
      action: 'event.attendance_opened',
      resourceType: 'attendance_session',
      resourceId: session.id,
      newValue: { eventId, closesAt, methods: event.attendanceMethods },
    });
    socketService.emitToUniversity(actor.universityId, 'event:attendance-opened', {
      eventId,
      sessionId: session.id,
      closesAt,
    });
    const registrations = await EventRegistrationModel.find({
      universityId: actor.universityId,
      eventId,
      registrationStatus: { $ne: 'cancelled' },
    })
      .select('userId')
      .lean()
      .exec();
    await eventNotificationService.deliver({
      universityId: actor.universityId,
      eventId,
      recipientIds: registrations.map((registration) => id(registration.userId)),
      eventChannels: event.notificationChannels,
      classification: event.mandatory ? 'mandatory' : 'operational',
      kind: 'event_attendance_opened',
      title: `Attendance is open: ${event.title}`,
      body: `Verified event check-in is available until ${closesAt.toLocaleTimeString('en-NG')}.`,
      priority: 'high',
      occurrenceKey: `attendance-opened-${session.id}`,
    });
    return {
      ...session.toJSON(),
      ...(dynamicQrEnabled ? { checkInCode, qrToken: this.qrToken(session) } : {}),
    };
  }

  async closeEventSession(actor: RequestActor, eventId: string, sessionId: string) {
    const session = await AttendanceSessionModel.findOneAndUpdate(
      {
        _id: sessionId,
        universityId: actor.universityId,
        contextType: 'EVENT_SESSION',
        eventId,
        status: 'open',
      },
      { $set: { status: 'closed', closedAt: new Date(), updatedBy: actor.id } },
      { new: true },
    ).exec();
    if (!session) {
      const existing = await AttendanceSessionModel.findOne({
        _id: sessionId,
        universityId: actor.universityId,
        contextType: 'EVENT_SESSION',
        eventId,
      }).exec();
      if (!existing)
        throw Object.assign(new Error('Event attendance session was not found.'), {
          statusCode: 404,
        });
      return existing.toJSON();
    }
    await auditService.record({
      actor,
      action: 'event.attendance_closed',
      resourceType: 'attendance_session',
      resourceId: session.id,
      newValue: { eventId, closedAt: session.closedAt },
    });
    socketService.emitToUniversity(actor.universityId, 'event:attendance-closed', {
      eventId,
      sessionId,
    });
    const [event, registrations] = await Promise.all([
      import('../models/event.model.js').then(({ EventModel }) =>
        EventModel.findOne({ _id: eventId, universityId: actor.universityId })
          .select('title mandatory notificationChannels')
          .lean()
          .exec(),
      ),
      EventRegistrationModel.find({
        universityId: actor.universityId,
        eventId,
        registrationStatus: { $ne: 'cancelled' },
      })
        .select('userId')
        .lean()
        .exec(),
    ]);
    if (event)
      await eventNotificationService.deliver({
        universityId: actor.universityId,
        eventId,
        recipientIds: registrations.map((registration) => id(registration.userId)),
        eventChannels: event.notificationChannels,
        classification: event.mandatory ? 'mandatory' : 'operational',
        kind: 'event_attendance_closed',
        title: `Attendance closed: ${event.title}`,
        body: 'Event attendance is closed. Verified participation records are now available.',
        priority: 'normal',
        occurrenceKey: `attendance-closed-${session.id}`,
      });
    return session.toJSON();
  }

  private async activeEventSession(
    actor: RequestActor,
    eventId: string,
    input: Pick<EventCheckInInput, 'code' | 'token' | 'pin'>,
  ) {
    let session;
    if (input.pin && !input.code && !input.token) {
      session = await AttendanceSessionModel.findOne({
        universityId: actor.universityId,
        contextType: 'EVENT_SESSION',
        eventId,
        status: 'open',
        closesAt: { $gt: new Date() },
        pinAttendanceAllowed: true,
      })
        .select('+attendancePinHash +checkInCode +qrNonce +qrNonceHash')
        .exec();
      if (
        !session ||
        !session.attendancePinHash ||
        hashQrNonce(input.pin) !== session.attendancePinHash
      )
        throw Object.assign(new Error('The event attendance PIN is invalid or unavailable.'), {
          statusCode: 422,
        });
    } else {
      session = await this.activeSession(actor, input);
      if (!session.dynamicQrEnabled)
        throw Object.assign(new Error('Dynamic QR attendance is disabled for this event.'), {
          statusCode: 403,
        });
    }
    if (session.contextType !== 'EVENT_SESSION' || id(session.eventId) !== eventId)
      throw Object.assign(new Error('The attendance credential does not belong to this event.'), {
        statusCode: 422,
      });
    return session;
  }

  async eventRequirements(
    actor: RequestActor,
    eventId: string,
    input: Pick<EventCheckInInput, 'code' | 'token' | 'pin'>,
  ) {
    const registration = await EventRegistrationModel.exists({
      universityId: actor.universityId,
      eventId,
      userId: actor.id,
      registrationStatus: { $ne: 'cancelled' },
    });
    if (!registration)
      throw Object.assign(new Error('This event is outside your assigned audience.'), {
        statusCode: 403,
      });
    const session = await this.activeEventSession(actor, eventId, input);
    return {
      gpsRequired: session.gpsRequired,
      faceVerificationRequired: session.faceVerificationRequired,
      faceProfileEnrolled: session.faceVerificationRequired
        ? await faceVerificationService.hasProfile(actor)
        : false,
      pinAccepted: Boolean(input.pin),
      closesAt: session.closesAt,
    };
  }

  async eventCheckIn(
    actor: RequestActor,
    eventId: string,
    input: EventCheckInInput,
    context: { readonly ipAddress?: string; readonly userAgent?: string } = {},
  ) {
    const session = await this.activeEventSession(actor, eventId, input);
    const registration = await EventRegistrationModel.findOne({
      universityId: actor.universityId,
      eventId,
      userId: actor.id,
      registrationStatus: { $ne: 'cancelled' },
    }).exec();
    if (!registration)
      throw Object.assign(new Error('This event is outside your assigned audience.'), {
        statusCode: 403,
      });
    const event = await import('../models/event.model.js').then(({ EventModel }) =>
      EventModel.findOne({ _id: eventId, universityId: actor.universityId })
        .select('title startsAt registrationRequired mandatory notificationChannels')
        .lean()
        .exec(),
    );
    if (!event) throw Object.assign(new Error('Event was not found.'), { statusCode: 404 });
    if (event.registrationRequired && registration.registrationStatus !== 'registered')
      throw Object.assign(new Error('Register for this event before checking in.'), {
        statusCode: 403,
      });
    if (
      await AttendanceRecordModel.exists({
        universityId: actor.universityId,
        sessionId: session.id,
        studentId: actor.id,
      })
    )
      throw Object.assign(
        new Error('Attendance has already been recorded for this event session.'),
        { statusCode: 409 },
      );
    const { gpsResult, faceResult } = await this.verificationFactors(actor, session, input);
    const viaPin = Boolean(input.pin && !input.code && !input.token);
    const checkedInAt = new Date();
    const status =
      checkedInAt.getTime() > event.startsAt.getTime() + 15 * 60_000 ? 'late' : 'present';
    const methods = [
      viaPin ? ('pin' as const) : ('dynamic_qr' as const),
      ...(gpsResult ? (['gps'] as const) : []),
      ...(faceResult ? (['face'] as const) : []),
    ];
    let record;
    try {
      record = await AttendanceRecordModel.create({
        contextType: 'EVENT_SESSION',
        sessionId: session.id,
        eventId,
        studentId: actor.id,
        checkedInAt,
        status,
        method: viaPin ? 'pin' : 'dynamic_qr',
        verificationMethods: methods,
        verificationStatus: 'verified',
        qrVerified: !viaPin,
        pinVerified: viaPin,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        gps: gpsResult,
        faceVerification: faceResult,
        universityId: actor.universityId,
        createdBy: actor.id,
        updatedBy: actor.id,
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11_000)
        throw Object.assign(
          new Error('Attendance has already been recorded for this event session.'),
          { statusCode: 409 },
        );
      throw error;
    }
    registration.set({ participationStatus: status, updatedBy: actor.id });
    await registration.save();
    await auditService.record({
      actor,
      action: 'event.attendance_recorded',
      resourceType: 'attendance_record',
      resourceId: record.id,
      newValue: { eventId, sessionId: session.id, status, methods },
      ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
      ...(context.userAgent ? { userAgent: context.userAgent } : {}),
    });
    socketService.emitToUniversity(actor.universityId, 'event:attendance-recorded', {
      eventId,
      sessionId: session.id,
      userId: actor.id,
      status,
      checkedInAt,
    });
    socketService.emitToUniversity(actor.universityId, 'dashboard:updated', {
      reason: 'event-attendance-recorded',
      eventId,
    });
    await eventNotificationService.deliver({
      universityId: actor.universityId,
      eventId,
      recipientIds: [actor.id],
      eventChannels: event.notificationChannels,
      classification: event.mandatory ? 'mandatory' : 'operational',
      kind: 'event_attendance_recorded',
      title: 'Event attendance recorded',
      body: `${event.title} was recorded as ${status}.`,
      priority: 'normal',
      occurrenceKey: `attendance-recorded-${record.id}`,
    });
    return record.toJSON();
  }

  async recordManualEventAttendance(
    actor: RequestActor,
    event: {
      readonly _id: unknown;
      readonly title: string;
      readonly manualAttendanceAllowed: boolean;
      readonly mandatory: boolean;
      readonly notificationChannels: readonly ('in_app' | 'email' | 'push' | 'sms')[];
    },
    input: {
      readonly userId: string;
      readonly status: 'present' | 'late' | 'excused' | 'rejected';
      readonly reason: string;
    },
  ) {
    const eventId = id(event._id);
    if (!event.manualAttendanceAllowed)
      throw Object.assign(new Error('Manual attendance is disabled for this event.'), {
        statusCode: 403,
      });
    const registration = await EventRegistrationModel.findOne({
      universityId: actor.universityId,
      eventId,
      userId: input.userId,
    }).exec();
    if (!registration)
      throw Object.assign(new Error('Event participant was not found.'), { statusCode: 404 });
    const session = await AttendanceSessionModel.findOne({
      universityId: actor.universityId,
      eventId,
      contextType: 'EVENT_SESSION',
    })
      .sort({ openedAt: -1 })
      .exec();
    if (!session)
      throw Object.assign(
        new Error('Open an event attendance session before recording manual attendance.'),
        { statusCode: 409 },
      );
    const existing = await AttendanceRecordModel.findOne({
      universityId: actor.universityId,
      sessionId: session.id,
      studentId: input.userId,
    }).exec();
    const oldValue = existing?.toJSON();
    const record = await AttendanceRecordModel.findOneAndUpdate(
      { universityId: actor.universityId, sessionId: session.id, studentId: input.userId },
      {
        $set: {
          status: input.status,
          method: 'manual',
          verificationMethods: ['manual'],
          verificationStatus: input.status === 'rejected' ? 'rejected' : 'verified',
          manualReason: input.reason,
          checkedInAt: new Date(),
          updatedBy: actor.id,
        },
        $setOnInsert: {
          contextType: 'EVENT_SESSION',
          eventId,
          universityId: actor.universityId,
          sessionId: session.id,
          studentId: input.userId,
          qrVerified: false,
          pinVerified: false,
          createdBy: actor.id,
        },
      },
      { new: true, upsert: true, runValidators: true },
    ).exec();
    registration.set({ participationStatus: input.status, updatedBy: actor.id });
    await registration.save();
    await auditService.record({
      actor,
      action: 'event.attendance_manually_recorded',
      resourceType: 'attendance_record',
      resourceId: record.id,
      oldValue,
      newValue: { eventId, userId: input.userId, status: input.status, reason: input.reason },
    });
    socketService.emitToUniversity(actor.universityId, 'event:attendance-recorded', {
      eventId,
      sessionId: session.id,
      userId: input.userId,
      status: input.status,
      manual: true,
    });
    await eventNotificationService.deliver({
      universityId: actor.universityId,
      eventId,
      recipientIds: [input.userId],
      eventChannels: event.notificationChannels,
      classification: event.mandatory ? 'mandatory' : 'operational',
      kind: 'event_attendance_updated',
      title: 'Event attendance updated',
      body: `${event.title} is recorded as ${input.status}.`,
      priority: 'normal',
      occurrenceKey: `manual-${record.id}-${Date.now()}`,
    });
    return record.toJSON();
  }

  async verifyClearance(actor: RequestActor, rawRegistrationNumber: string) {
    await this.closeExpired(actor.universityId);
    const registrationNumber = rawRegistrationNumber.trim().toUpperCase();
    const registration = await CourseRegistrationModel.findOne({
      universityId: actor.universityId,
      registrationNumber,
      status: 'approved',
    })
      .select('studentId')
      .lean()
      .exec();
    if (!registration)
      throw Object.assign(new Error('No approved registration was found for this student.'), {
        statusCode: 404,
      });
    const [student, registrations] = await Promise.all([
      UserModel.findOne({
        _id: registration.studentId,
        universityId: actor.universityId,
        role: 'student',
      })
        .select('firstName lastName email accountStatus')
        .lean()
        .exec(),
      CourseRegistrationModel.find({
        universityId: actor.universityId,
        studentId: registration.studentId,
        status: 'approved',
      })
        .select('courseId')
        .lean()
        .exec(),
    ]);
    if (!student)
      throw Object.assign(new Error('Student account was not found.'), { statusCode: 404 });
    const courses = await CourseModel.find({
      _id: { $in: registrations.map((item) => item.courseId) },
      universityId: actor.universityId,
    })
      .select('code title attendanceRequirement')
      .sort({ code: 1 })
      .lean()
      .exec();
    return {
      registrationNumber,
      student: {
        id: id(student._id),
        fullName: `${student.firstName} ${student.lastName}`,
        email: student.email,
        accountStatus: student.accountStatus,
      },
      courses: await Promise.all(
        courses.map((course) =>
          this.progress(actor.universityId, id(registration.studentId), course),
        ),
      ),
      verifiedAt: new Date().toISOString(),
    };
  }
}

export const attendanceService = new AttendanceService();
