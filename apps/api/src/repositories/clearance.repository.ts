import mongoose from 'mongoose';
import type { ClearanceReportStatus } from '@qr/types';
import { AttendanceRecordModel } from '../models/attendance-record.model.js';
import { AttendanceSessionModel } from '../models/attendance-session.model.js';
import { ClearanceReportModel } from '../models/clearance-report.model.js';
import { CourseModel } from '../models/course.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { DepartmentModel } from '../models/department.model.js';
import { ReportArchiveEventModel } from '../models/report-archive-event.model.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';
import { UniversityModel } from '../models/university.model.js';
import { UserModel } from '../models/user.model.js';
import { StudentProfileModel } from '../models/student-profile.model.js';

interface ArchiveEventInput {
  readonly reportId: string;
  readonly universityId: string;
  readonly actorId: string;
  readonly event:
    'generated' | 'downloaded_pdf' | 'downloaded_excel' | 'downloaded_csv' | 'printed';
  readonly format?: 'pdf' | 'xlsx' | 'csv' | 'print';
  readonly checksum: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export class ClearanceRepository {
  async eligibilitySource(universityId: string, studentId: string, courseId: string) {
    const registration = await CourseRegistrationModel.findOne({
      universityId,
      studentId,
      courseId,
      status: 'approved',
    })
      .select('registrationNumber status courseId studentId')
      .lean()
      .exec();
    if (!registration) return null;
    const [student, studentProfile, course, university, settings, sessions] = await Promise.all([
      UserModel.findOne({ _id: studentId, universityId, role: 'student' })
        .select('firstName lastName photoUrl matricNumber programme level accountStatus')
        .lean()
        .exec(),
      StudentProfileModel.findOne({ userId: studentId, universityId })
        .select('photoAssetId')
        .lean()
        .exec(),
      CourseModel.findOne({ _id: courseId, universityId })
        .select('code title departmentId attendanceRequirement status')
        .lean()
        .exec(),
      UniversityModel.findById(universityId)
        .select('name logoAssetId logoUrl status')
        .lean()
        .exec(),
      SystemSettingsModel.findOne({ universityId })
        .select('academicSession currentSemester brandingName')
        .lean()
        .exec(),
      AttendanceSessionModel.find({
        universityId,
        courseId,
        $or: [{ status: 'closed' }, { closesAt: { $lte: new Date() } }],
      })
        .select('_id openedAt closesAt closedAt')
        .sort({ openedAt: 1 })
        .lean()
        .exec(),
    ]);
    if (!student || !course || !university) return null;
    const [department, records] = await Promise.all([
      DepartmentModel.findOne({ _id: course.departmentId, universityId })
        .select('name facultyName')
        .lean()
        .exec(),
      AttendanceRecordModel.find({
        universityId,
        studentId,
        courseId,
        sessionId: { $in: sessions.map((session) => session._id) },
      })
        .select('_id sessionId checkedInAt status')
        .sort({ checkedInAt: 1 })
        .lean()
        .exec(),
    ]);
    if (!department) return null;
    return {
      registration,
      student,
      studentProfile,
      course,
      university,
      settings,
      department,
      sessions,
      records,
    };
  }

  async studentRegistrations(universityId: string, studentId: string) {
    return CourseRegistrationModel.find({ universityId, studentId, status: 'approved' })
      .select('_id courseId registrationNumber')
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async nextVersion(universityId: string, studentId: string, courseId: string): Promise<number> {
    const latest = await ClearanceReportModel.findOne({ universityId, studentId, courseId })
      .select('version')
      .sort({ version: -1 })
      .lean()
      .exec();
    return (latest?.version ?? 0) + 1;
  }

  async validReport(universityId: string, studentId: string, courseId: string) {
    return ClearanceReportModel.findOne({
      universityId,
      studentId,
      courseId,
      status: 'valid',
    })
      .select('+verificationCode +digitalSignature')
      .exec();
  }

  async createReport(
    universityId: string,
    studentId: string,
    courseId: string,
    actorId: string,
    values: Readonly<Record<string, unknown>>,
  ) {
    const transaction = await mongoose.startSession();
    let createdId: string | undefined;
    try {
      await transaction.withTransaction(async () => {
        await ClearanceReportModel.updateMany(
          { universityId, studentId, courseId, status: 'valid' },
          {
            $set: {
              status: 'expired',
              revokedAt: new Date(),
              revokedBy: actorId,
              revokedReason: 'A newer report version was generated.',
              updatedBy: actorId,
            },
          },
          { session: transaction },
        ).exec();
        const [report] = await ClearanceReportModel.create(
          [
            {
              ...values,
              universityId,
              studentId,
              courseId,
              generatedBy: actorId,
              createdBy: actorId,
              updatedBy: actorId,
            },
          ],
          { session: transaction },
        );
        if (!report) throw new Error('Clearance report could not be created.');
        createdId = report.id;
        await ReportArchiveEventModel.create(
          [
            {
              reportId: report._id,
              event: 'generated',
              checksum: report.checksum,
              occurredAt: report.issuedAt,
              universityId,
              createdBy: actorId,
              updatedBy: actorId,
            },
          ],
          { session: transaction },
        );
      });
    } finally {
      await transaction.endSession();
    }
    if (!createdId) throw new Error('Clearance report transaction did not complete.');
    return ClearanceReportModel.findById(createdId)
      .select('+verificationCode +digitalSignature')
      .exec();
  }

  async list(
    universityId: string,
    input: {
      readonly studentId?: string;
      readonly status?: ClearanceReportStatus;
      readonly search?: string;
      readonly page: number;
      readonly limit: number;
    },
  ) {
    const filter: Record<string, unknown> = { universityId };
    if (input.studentId) filter.studentId = input.studentId;
    if (input.status) filter.status = input.status;
    if (input.search) {
      const escaped = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { reportId: { $regex: escaped, $options: 'i' } },
        { registrationNumber: { $regex: escaped, $options: 'i' } },
        { 'snapshot.student.name': { $regex: escaped, $options: 'i' } },
        { 'snapshot.course.code': { $regex: escaped, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      ClearanceReportModel.find(filter)
        .sort({ issuedAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      ClearanceReportModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async findAuthorized(universityId: string, reportId: string, studentId?: string) {
    return ClearanceReportModel.findOne({
      universityId,
      reportId,
      ...(studentId ? { studentId } : {}),
    })
      .select('+verificationCode +verificationTokenHash +digitalSignature')
      .exec();
  }

  async findForVerification(reference: string) {
    return ClearanceReportModel.findOne({
      $or: [
        { reportId: reference.toUpperCase() },
        { verificationTokenHash: reference },
        { verificationCode: reference },
      ],
    })
      .select('+verificationCode +verificationTokenHash +digitalSignature')
      .exec();
  }

  async searchForExaminer(universityId: string, reference: string) {
    const escaped = reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return ClearanceReportModel.find({
      universityId,
      $or: [
        { reportId: { $regex: escaped, $options: 'i' } },
        { registrationNumber: { $regex: escaped, $options: 'i' } },
        { 'snapshot.student.name': { $regex: escaped, $options: 'i' } },
        { 'snapshot.student.matricNumber': { $regex: escaped, $options: 'i' } },
        { 'snapshot.course.code': { $regex: escaped, $options: 'i' } },
      ],
    })
      .select('+verificationCode +digitalSignature')
      .sort({ issuedAt: -1 })
      .limit(50)
      .exec();
  }

  async setStatus(
    reportId: string,
    status: Extract<ClearanceReportStatus, 'revoked' | 'expired'>,
    actorId: string,
    reason: string,
  ) {
    return ClearanceReportModel.findOneAndUpdate(
      { _id: reportId, status: 'valid' },
      {
        $set: {
          status,
          revokedAt: new Date(),
          revokedBy: actorId,
          revokedReason: reason,
          updatedBy: actorId,
        },
      },
      { new: true },
    ).exec();
  }

  async expireCourseReports(universityId: string, courseId: string, actorId: string) {
    return ClearanceReportModel.updateMany(
      { universityId, courseId, status: 'valid' },
      {
        $set: {
          status: 'expired',
          revokedAt: new Date(),
          revokedBy: actorId,
          revokedReason: 'Attendance data changed after this report was generated.',
          updatedBy: actorId,
        },
      },
    ).exec();
  }

  async expireStudentReports(universityId: string, studentId: string, actorId: string) {
    return ClearanceReportModel.updateMany(
      { universityId, studentId, status: 'valid' },
      {
        $set: {
          status: 'expired',
          revokedAt: new Date(),
          revokedBy: actorId,
          revokedReason: 'The student account changed after this report was generated.',
          updatedBy: actorId,
        },
      },
    ).exec();
  }

  async expireStudentCourseReport(
    universityId: string,
    studentId: string,
    courseId: string,
    actorId: string,
  ) {
    return ClearanceReportModel.updateMany(
      { universityId, studentId, courseId, status: 'valid' },
      {
        $set: {
          status: 'expired',
          revokedAt: new Date(),
          revokedBy: actorId,
          revokedReason: 'Course registration changed after this report was generated.',
          updatedBy: actorId,
        },
      },
    ).exec();
  }

  async recordEvent(input: ArchiveEventInput): Promise<void> {
    const isPrint = input.event === 'printed';
    await Promise.all([
      ReportArchiveEventModel.create({
        reportId: input.reportId,
        event: input.event,
        ...(input.format ? { format: input.format } : {}),
        checksum: input.checksum,
        occurredAt: new Date(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        universityId: input.universityId,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      }),
      ClearanceReportModel.updateOne(
        { _id: input.reportId, universityId: input.universityId },
        {
          $inc: isPrint ? { printCount: 1 } : { downloadCount: 1 },
          $set: { updatedBy: input.actorId },
        },
      ).exec(),
    ]);
  }
}

export const clearanceRepository = new ClearanceRepository();
