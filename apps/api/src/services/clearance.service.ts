import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  ClearanceArchivePage,
  ClearanceReportDetail,
  ClearanceReportSummary,
  ClearanceVerification,
  CourseEligibility,
  EligibilityDecision,
  RequestActor,
} from '@qr/types';
import { environment } from '../config/environment.js';
import { clearanceRepository } from '../repositories/clearance.repository.js';
import { auditService } from './audit.service.js';
import { notificationService } from './notification.service.js';
import { socketService } from '../socket/socket.service.js';

type EligibilitySource = NonNullable<
  Awaited<ReturnType<typeof clearanceRepository.eligibilitySource>>
>;

interface RequestMetadata {
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

function textId(value: unknown): string {
  return String(value);
}

function stableValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function checksum(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex');
}

export function decideEligibility(
  sessionsAttended: number,
  sessionsHeld: number,
  requiredPercentage: number,
): { readonly attendancePercentage: number; readonly decision: EligibilityDecision } {
  if (sessionsHeld === 0) return { attendancePercentage: 0, decision: 'pending' };
  const attendancePercentage = Math.round((sessionsAttended / sessionsHeld) * 10_000) / 100;
  return {
    attendancePercentage,
    decision: attendancePercentage >= requiredPercentage ? 'eligible' : 'not_eligible',
  };
}

function sourceData(source: EligibilitySource) {
  return {
    registration: {
      id: textId(source.registration._id),
      status: source.registration.status,
      number: source.registration.registrationNumber,
    },
    student: { id: textId(source.student._id), accountStatus: source.student.accountStatus },
    university: { id: textId(source.university._id), status: source.university.status },
    course: {
      id: textId(source.course._id),
      status: source.course.status,
      requirement: source.course.attendanceRequirement,
    },
    sessions: source.sessions.map((session) => ({
      id: textId(session._id),
      openedAt: session.openedAt,
      closesAt: session.closesAt,
      closedAt: session.closedAt,
    })),
    records: source.records.map((record) => ({
      id: textId(record._id),
      sessionId: textId(record.sessionId),
      checkedInAt: record.checkedInAt,
      status: record.status,
    })),
  };
}

function currentStreak(source: EligibilitySource): number {
  const attended = new Set(source.records.map((record) => textId(record.sessionId)));
  let streak = 0;
  for (const session of [...source.sessions].reverse()) {
    if (!attended.has(textId(session._id))) break;
    streak += 1;
  }
  return streak;
}

function eligibility(source: EligibilitySource): CourseEligibility {
  const present = source.records.length;
  const result = decideEligibility(
    present,
    source.sessions.length,
    source.course.attendanceRequirement,
  );
  return {
    registrationId: textId(source.registration._id),
    registrationNumber: source.registration.registrationNumber,
    courseId: textId(source.course._id),
    courseCode: source.course.code,
    courseTitle: source.course.title,
    sessionsHeld: source.sessions.length,
    present,
    late: 0,
    absent: Math.max(0, source.sessions.length - present),
    excused: 0,
    attendancePercentage: result.attendancePercentage,
    requiredPercentage: source.course.attendanceRequirement,
    attendanceScore: result.attendancePercentage,
    currentStreak: currentStreak(source),
    decision: result.decision,
    calculatedAt: new Date().toISOString(),
  };
}

function verificationUrl(code: string): string {
  return `${environment.CLEARANCE_VERIFICATION_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(code)}`;
}

function sign(value: string): string {
  return createHmac('sha256', environment.REPORT_SIGNING_SECRET).update(value).digest('base64url');
}

function signatureMatches(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

type ReportDocument = NonNullable<Awaited<ReturnType<typeof clearanceRepository.validReport>>>;

interface StoredSnapshot {
  readonly university: {
    readonly name: string;
    readonly logoAssetId?: string | null;
    readonly logoUrl?: string | null;
  };
  readonly faculty: string;
  readonly department: string;
  readonly student: {
    readonly id: string;
    readonly name: string;
    readonly matricNumber: string;
    readonly photoAssetId?: string | null;
    readonly photoUrl?: string | null;
    readonly programme: string;
    readonly level: string;
  };
  readonly academicSession: string;
  readonly semester: string;
  readonly course: { readonly id: string; readonly code: string; readonly title: string };
  readonly statistics: {
    readonly sessionsHeld: number;
    readonly present: number;
    readonly late: number;
    readonly absent: number;
    readonly excused: number;
    readonly attendancePercentage: number;
    readonly requiredPercentage: number;
    readonly attendanceScore: number;
    readonly currentStreak: number;
    readonly decision: EligibilityDecision;
    readonly calculatedAt: string;
  };
}

export function snapshotStatistics(result: CourseEligibility): StoredSnapshot['statistics'] {
  return {
    sessionsHeld: result.sessionsHeld,
    present: result.present,
    late: result.late,
    absent: result.absent,
    excused: result.excused,
    attendancePercentage: result.attendancePercentage,
    requiredPercentage: result.requiredPercentage,
    attendanceScore: result.attendanceScore,
    currentStreak: result.currentStreak,
    decision: result.decision,
    calculatedAt: result.calculatedAt,
  };
}

function storedSnapshot(report: ReportDocument): StoredSnapshot {
  const value = report.snapshot;
  if (!value?.university || !value.student || !value.course || !value.statistics)
    throw Object.assign(new Error('Clearance report snapshot is incomplete.'), { statusCode: 500 });
  return value as StoredSnapshot;
}

function summary(report: ReportDocument): ClearanceReportSummary {
  const snapshot = storedSnapshot(report);
  return {
    id: textId(report._id),
    reportId: report.reportId,
    version: report.version,
    status: report.status,
    registrationNumber: report.registrationNumber,
    studentName: snapshot.student.name,
    courseCode: snapshot.course.code,
    courseTitle: snapshot.course.title,
    attendancePercentage: snapshot.statistics.attendancePercentage,
    requiredPercentage: snapshot.statistics.requiredPercentage,
    decision: snapshot.statistics.decision,
    issuedAt: report.issuedAt.toISOString(),
    ...(report.revokedAt ? { revokedAt: report.revokedAt.toISOString() } : {}),
    ...(report.revokedReason ? { revokedReason: report.revokedReason } : {}),
    checksum: report.checksum,
    downloadCount: report.downloadCount,
    printCount: report.printCount,
  };
}

function detail(report: ReportDocument): ClearanceReportDetail {
  const snapshot = storedSnapshot(report);
  return {
    ...summary(report),
    verificationCode: report.verificationCode,
    verificationUrl: verificationUrl(report.verificationCode),
    university: {
      name: snapshot.university.name,
      ...(snapshot.university.logoAssetId ? { logoAssetId: snapshot.university.logoAssetId } : {}),
      ...(snapshot.university.logoUrl ? { logoUrl: snapshot.university.logoUrl } : {}),
    },
    faculty: snapshot.faculty,
    department: snapshot.department,
    student: {
      id: snapshot.student.id,
      name: snapshot.student.name,
      matricNumber: snapshot.student.matricNumber,
      ...(snapshot.student.photoAssetId ? { photoAssetId: snapshot.student.photoAssetId } : {}),
      ...(snapshot.student.photoUrl ? { photoUrl: snapshot.student.photoUrl } : {}),
      programme: snapshot.student.programme,
      level: snapshot.student.level,
    },
    academicSession: snapshot.academicSession,
    semester: snapshot.semester,
    course: {
      id: snapshot.course.id,
      code: snapshot.course.code,
      title: snapshot.course.title,
    },
    courseRegistrationConfirmed: true,
    statistics: {
      sessionsHeld: snapshot.statistics.sessionsHeld,
      present: snapshot.statistics.present,
      late: snapshot.statistics.late,
      absent: snapshot.statistics.absent,
      excused: snapshot.statistics.excused,
      attendancePercentage: snapshot.statistics.attendancePercentage,
      requiredPercentage: snapshot.statistics.requiredPercentage,
      attendanceScore: snapshot.statistics.attendanceScore,
      currentStreak: snapshot.statistics.currentStreak,
      decision: snapshot.statistics.decision,
      calculatedAt: snapshot.statistics.calculatedAt,
    },
    generatedBy: textId(report.generatedBy),
    digitalSignature: report.digitalSignature,
  };
}

function documentPayload(report: ReportDocument): unknown {
  return {
    reportId: report.reportId,
    version: report.version,
    issuedAt: report.issuedAt,
    snapshot: report.snapshot,
    sourceDataHash: report.sourceDataHash,
  };
}

export function reportIntegrityMatches(report: ReportDocument): boolean {
  return (
    checksum(documentPayload(report)) === report.checksum &&
    signatureMatches(report.checksum, report.digitalSignature)
  );
}

export function canReuseReport(report: ReportDocument, sourceDataHash: string): boolean {
  return report.sourceDataHash === sourceDataHash && reportIntegrityMatches(report);
}

export class ClearanceService {
  private async sourceOrThrow(universityId: string, studentId: string, courseId: string) {
    const source = await clearanceRepository.eligibilitySource(universityId, studentId, courseId);
    if (!source)
      throw Object.assign(
        new Error('An approved course registration and active student record are required.'),
        { statusCode: 404 },
      );
    if (
      source.student.accountStatus !== 'active' ||
      source.course.status !== 'active' ||
      source.university.status !== 'active'
    )
      throw Object.assign(
        new Error('Clearance requires active student, course, and university records.'),
        { statusCode: 422 },
      );
    return source;
  }

  async eligibilityForStudent(actor: RequestActor): Promise<readonly CourseEligibility[]> {
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can view personal exam eligibility.'), {
        statusCode: 403,
      });
    const registrations = await clearanceRepository.studentRegistrations(
      actor.universityId,
      actor.id,
    );
    return Promise.all(
      registrations.map(async (registration) =>
        eligibility(
          await this.sourceOrThrow(actor.universityId, actor.id, textId(registration.courseId)),
        ),
      ),
    );
  }

  async generate(
    actor: RequestActor,
    input: { readonly courseId: string; readonly studentId?: string },
  ): Promise<ClearanceReportDetail> {
    const studentId = actor.role === 'student' ? actor.id : input.studentId;
    if (!studentId)
      throw Object.assign(new Error('A student is required when staff generate clearance.'), {
        statusCode: 422,
      });
    if (actor.role !== 'student' && !actor.permissions.includes('reports:write'))
      throw Object.assign(new Error('You cannot generate student clearance reports.'), {
        statusCode: 403,
      });
    const source = await this.sourceOrThrow(actor.universityId, studentId, input.courseId);
    const result = eligibility(source);
    if (result.decision !== 'eligible')
      throw Object.assign(
        new Error(
          result.decision === 'pending'
            ? 'Clearance is pending until at least one attendance session is completed.'
            : `Clearance cannot be approved because attendance is ${result.attendancePercentage}% and the requirement is ${result.requiredPercentage}%.`,
        ),
        { statusCode: 422 },
      );
    const sourceDataHash = checksum(sourceData(source));
    const current = await clearanceRepository.validReport(
      actor.universityId,
      studentId,
      input.courseId,
    );
    if (current && canReuseReport(current, sourceDataHash)) return detail(current);
    const issuedAt = new Date();
    const version = await clearanceRepository.nextVersion(
      actor.universityId,
      studentId,
      input.courseId,
    );
    const reportId = `ACL-${issuedAt.toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(5).toString('hex').toUpperCase()}`;
    const verificationCode = randomBytes(24).toString('base64url');
    const snapshot = {
      university: {
        name: source.university.name,
        ...(source.university.logoAssetId
          ? { logoAssetId: textId(source.university.logoAssetId) }
          : {}),
        ...(source.university.logoUrl ? { logoUrl: source.university.logoUrl } : {}),
      },
      faculty: source.department.facultyName,
      department: source.department.name,
      student: {
        id: studentId,
        name: `${source.student.firstName} ${source.student.lastName}`,
        matricNumber: source.student.matricNumber ?? source.registration.registrationNumber,
        ...(source.studentProfile?.photoAssetId
          ? { photoAssetId: textId(source.studentProfile.photoAssetId) }
          : {}),
        ...(source.student.photoUrl ? { photoUrl: source.student.photoUrl } : {}),
        programme: source.student.programme ?? source.department.name,
        level: source.student.level ?? 'Not configured',
      },
      academicSession: source.settings?.academicSession ?? 'Not configured',
      semester: source.settings?.currentSemester ?? 'Not configured',
      course: { id: input.courseId, code: source.course.code, title: source.course.title },
      courseRegistrationConfirmed: true as const,
      statistics: snapshotStatistics(result),
    };
    const payload = { reportId, version, issuedAt, snapshot, sourceDataHash };
    const reportChecksum = checksum(payload);
    const created = await clearanceRepository.createReport(
      actor.universityId,
      studentId,
      input.courseId,
      actor.id,
      {
        reportId,
        verificationCode,
        verificationTokenHash: checksum(verificationCode),
        registrationId: source.registration._id,
        registrationNumber: source.registration.registrationNumber,
        version,
        status: 'valid',
        snapshot,
        sourceDataHash,
        checksum: reportChecksum,
        digitalSignature: sign(reportChecksum),
        issuedAt,
      },
    );
    if (!created) throw new Error('Clearance report could not be retrieved after generation.');
    await Promise.all([
      auditService.record({
        action: 'clearance_report.generated',
        resourceType: 'clearance_report',
        resourceId: created.reportId,
        actor,
        newValue: { version, checksum: reportChecksum, courseId: input.courseId, studentId },
      }),
      notificationService.create({
        universityId: actor.universityId,
        recipientId: studentId,
        title: `${source.course.code} clearance approved`,
        body: `Attendance clearance report ${reportId} is ready to download and present for examination.`,
        category: 'clearance_approved',
        priority: 'high',
        metadata: { reportId, courseId: input.courseId },
      }),
    ]);
    socketService.emitToUniversity(actor.universityId, 'clearance:updated', {
      reportId,
      courseId: input.courseId,
      studentId,
    });
    return detail(created);
  }

  async archive(
    actor: RequestActor,
    input: {
      readonly status?: 'valid' | 'revoked' | 'expired';
      readonly search?: string;
      readonly page: number;
      readonly limit: number;
    },
  ): Promise<ClearanceArchivePage> {
    if (!actor.permissions.includes('reports:read'))
      throw Object.assign(new Error('You cannot view the clearance archive.'), { statusCode: 403 });
    const result = await clearanceRepository.list(actor.universityId, {
      ...(actor.role === 'student' ? { studentId: actor.id } : {}),
      ...input,
    });
    return {
      items: result.items.map((item) => summary(item as ReportDocument)),
      pagination: {
        page: input.page,
        limit: input.limit,
        total: result.total,
        pages: Math.ceil(result.total / input.limit),
      },
    };
  }

  async get(actor: RequestActor, reportId: string): Promise<ClearanceReportDetail> {
    const report = await clearanceRepository.findAuthorized(
      actor.universityId,
      reportId.toUpperCase(),
      actor.role === 'student' ? actor.id : undefined,
    );
    if (!report)
      throw Object.assign(new Error('Clearance report was not found.'), { statusCode: 404 });
    return detail(report);
  }

  async verification(reference: string): Promise<ClearanceVerification> {
    const normalized = reference.trim();
    const lookup = normalized.toUpperCase().startsWith('ACL-')
      ? normalized.toUpperCase()
      : checksum(normalized);
    const report = await clearanceRepository.findForVerification(lookup);
    const verificationTime = new Date().toISOString();
    if (!report) return { verified: false, verificationTime, status: 'not_found' };
    if (!reportIntegrityMatches(report))
      return {
        verified: false,
        verificationTime,
        reportId: report.reportId,
        status: 'tampered',
        warning: 'The stored report failed its digital integrity check.',
      };
    if (report.status === 'valid') {
      const live = await clearanceRepository.eligibilitySource(
        textId(report.universityId),
        textId(report.studentId),
        textId(report.courseId),
      );
      const liveHash = live ? checksum(sourceData(live)) : '';
      if (!live || liveHash !== report.sourceDataHash) {
        await clearanceRepository.setStatus(
          textId(report._id),
          'expired',
          textId(report.generatedBy),
          'Attendance or registration data changed after report generation.',
        );
        report.status = 'expired';
        report.revokedReason = 'Attendance or registration data changed after report generation.';
      }
    }
    const snapshot = storedSnapshot(report);
    const verified = report.status === 'valid' && snapshot.statistics.decision === 'eligible';
    return {
      verified,
      verificationTime,
      reportId: report.reportId,
      status: report.status,
      ...(!verified
        ? { warning: report.revokedReason ?? 'This report is not valid for examination clearance.' }
        : {}),
      student: {
        name: snapshot.student.name,
        matricNumber: snapshot.student.matricNumber,
        ...(snapshot.student.photoUrl ? { photoUrl: snapshot.student.photoUrl } : {}),
      },
      course: { code: snapshot.course.code, title: snapshot.course.title },
      attendancePercentage: snapshot.statistics.attendancePercentage,
      requiredPercentage: snapshot.statistics.requiredPercentage,
      eligibility: snapshot.statistics.decision,
      issueDate: report.issuedAt.toISOString(),
    };
  }

  async examinerSearch(actor: RequestActor, reference: string) {
    const direct = await this.verification(reference);
    if (direct.status !== 'not_found') return [direct];
    const reports = await clearanceRepository.searchForExaminer(
      actor.universityId,
      reference.trim(),
    );
    const latestByCourse = new Map<string, (typeof reports)[number]>();
    for (const report of reports) {
      const key = `${textId(report.studentId)}:${textId(report.courseId)}`;
      if (!latestByCourse.has(key)) latestByCourse.set(key, report);
    }
    if (!latestByCourse.size)
      throw Object.assign(new Error('No generated clearance report matched that search.'), {
        statusCode: 404,
      });
    return Promise.all(
      [...latestByCourse.values()].map((report) => this.verification(report.reportId)),
    );
  }

  async revoke(actor: RequestActor, reportId: string, reason: string) {
    if (!actor.permissions.includes('reports:write'))
      throw Object.assign(new Error('You cannot revoke clearance reports.'), { statusCode: 403 });
    const report = await clearanceRepository.findAuthorized(actor.universityId, reportId);
    if (!report)
      throw Object.assign(new Error('Clearance report was not found.'), { statusCode: 404 });
    const revoked = await clearanceRepository.setStatus(report.id, 'revoked', actor.id, reason);
    if (!revoked)
      throw Object.assign(new Error('Only valid clearance reports can be revoked.'), {
        statusCode: 409,
      });
    await Promise.all([
      auditService.record({
        action: 'clearance_report.revoked',
        resourceType: 'clearance_report',
        resourceId: report.reportId,
        actor,
        oldValue: { status: report.status },
        newValue: { status: 'revoked', reason },
      }),
      notificationService.create({
        universityId: actor.universityId,
        recipientId: textId(report.studentId),
        title: `${report.snapshot?.course?.code ?? 'Attendance'} clearance revoked`,
        body: `Report ${report.reportId} was revoked. Reason: ${reason}`,
        category: 'clearance_revoked',
        priority: 'urgent',
        metadata: { reportId: report.reportId, courseId: textId(report.courseId), reason },
      }),
    ]);
    socketService.emitToUniversity(actor.universityId, 'clearance:updated', {
      reportId: report.reportId,
      studentId: textId(report.studentId),
      status: 'revoked',
    });
    return summary(revoked);
  }

  async expireForCourse(actor: RequestActor, courseId: string): Promise<number> {
    const result = await clearanceRepository.expireCourseReports(
      actor.universityId,
      courseId,
      actor.id,
    );
    if (result.modifiedCount)
      socketService.emitToUniversity(actor.universityId, 'clearance:updated', {
        courseId,
        expiredReports: result.modifiedCount,
      });
    return result.modifiedCount;
  }

  async expireForStudent(actor: RequestActor, studentId: string): Promise<number> {
    const result = await clearanceRepository.expireStudentReports(
      actor.universityId,
      studentId,
      actor.id,
    );
    if (result.modifiedCount)
      socketService.emitToUniversity(actor.universityId, 'clearance:updated', {
        studentId,
        expiredReports: result.modifiedCount,
      });
    return result.modifiedCount;
  }

  async expireForRegistration(
    actor: RequestActor,
    studentId: string,
    courseId: string,
  ): Promise<number> {
    const result = await clearanceRepository.expireStudentCourseReport(
      actor.universityId,
      studentId,
      courseId,
      actor.id,
    );
    if (result.modifiedCount)
      socketService.emitToUniversity(actor.universityId, 'clearance:updated', {
        studentId,
        courseId,
        expiredReports: result.modifiedCount,
      });
    return result.modifiedCount;
  }

  async recordExport(
    actor: RequestActor,
    report: ClearanceReportDetail,
    format: 'pdf' | 'xlsx' | 'csv' | 'print',
    metadata: RequestMetadata,
  ): Promise<void> {
    await clearanceRepository.recordEvent({
      reportId: report.id,
      universityId: actor.universityId,
      actorId: actor.id,
      event:
        format === 'print'
          ? 'printed'
          : format === 'xlsx'
            ? 'downloaded_excel'
            : `downloaded_${format}`,
      format,
      checksum: report.checksum,
      ...metadata,
    });
    await auditService.record({
      action: format === 'print' ? 'clearance_report.printed' : 'clearance_report.downloaded',
      resourceType: 'clearance_report',
      resourceId: report.reportId,
      actor,
      metadata: { format, checksum: report.checksum },
    });
  }

  async share(
    actor: RequestActor,
    reportId: string,
    metadata: RequestMetadata,
  ): Promise<{ readonly reportId: string; readonly verificationUrl: string }> {
    const report = await this.get(actor, reportId);
    await auditService.record({
      action: 'clearance_report.shared',
      resourceType: 'clearance_report',
      resourceId: report.reportId,
      actor,
      metadata: { verificationUrl: report.verificationUrl, ...metadata },
    });
    return { reportId: report.reportId, verificationUrl: report.verificationUrl };
  }
}

export const clearanceService = new ClearanceService();
