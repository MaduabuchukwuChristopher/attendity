import type { RequestActor } from '@qr/types';
import { AttendanceRecordModel } from '../models/attendance-record.model.js';
import { AttendanceSessionModel } from '../models/attendance-session.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { CourseModel } from '../models/course.model.js';
import { DepartmentModel } from '../models/department.model.js';
import { UserModel } from '../models/user.model.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';
import { UniversityModel } from '../models/university.model.js';
import { lecturerAssignmentService } from '../services/lecturer-assignment.service.js';

export interface AnalyticsCourseRecord {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly departmentId: string;
  readonly departmentName: string;
  readonly facultyName: string;
  readonly attendanceRequirement: number;
}

export interface AnalyticsSessionRecord {
  readonly id: string;
  readonly courseId: string;
  readonly openedAt: Date;
  readonly status: 'open' | 'closed';
}

export interface AnalyticsRegistrationRecord {
  readonly id: string;
  readonly courseId: string;
  readonly studentId: string;
  readonly registrationNumber: string;
}

export interface AnalyticsAttendanceRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly courseId: string;
  readonly studentId: string;
  readonly checkedInAt: Date;
  readonly status: 'present';
  readonly gpsVerified: boolean;
  readonly faceVerified: boolean;
}

export interface AnalyticsStudentRecord {
  readonly id: string;
  readonly fullName: string;
}

export interface AnalyticsDataset {
  readonly courses: readonly AnalyticsCourseRecord[];
  readonly sessions: readonly AnalyticsSessionRecord[];
  readonly registrations: readonly AnalyticsRegistrationRecord[];
  readonly records: readonly AnalyticsAttendanceRecord[];
  readonly students: readonly AnalyticsStudentRecord[];
}

function id(value: unknown): string {
  return String(value);
}

export class AnalyticsRepository {
  async branding(universityId: string): Promise<{
    readonly universityName: string;
    readonly displayName: string;
    readonly logoAssetId?: string;
    readonly logoUrl?: string;
  }> {
    const [university, settings] = await Promise.all([
      UniversityModel.findById(universityId).select('name logoAssetId logoUrl').lean().exec(),
      SystemSettingsModel.findOne({ universityId }).select('brandingName').lean().exec(),
    ]);
    const universityName = university?.name ?? 'University';
    return {
      universityName,
      displayName: settings?.brandingName ?? universityName,
      ...(university?.logoAssetId ? { logoAssetId: String(university.logoAssetId) } : {}),
      ...(university?.logoUrl ? { logoUrl: university.logoUrl } : {}),
    };
  }

  private async permittedCourseIds(
    actor: RequestActor,
    at = new Date(),
  ): Promise<readonly string[] | undefined> {
    if (actor.role === 'lecturer') {
      return lecturerAssignmentService.activeCourseIds(actor, at);
    }
    if (actor.role === 'student') {
      const registrations = await CourseRegistrationModel.find({
        universityId: actor.universityId,
        studentId: actor.id,
        status: 'approved',
      })
        .select('courseId')
        .lean()
        .exec();
      return registrations.map((registration) => id(registration.courseId));
    }
    return undefined;
  }

  async dataset(
    actor: RequestActor,
    from: Date,
    to: Date,
    options: { readonly courseId?: string; readonly studentId?: string } = {},
  ): Promise<AnalyticsDataset> {
    const permittedCourseIds = await this.permittedCourseIds(actor, to);
    if (options.courseId && permittedCourseIds && !permittedCourseIds.includes(options.courseId))
      throw Object.assign(new Error('The requested course is outside your permitted scope.'), {
        statusCode: 403,
      });
    const requestedCourseIds = options.courseId ? [options.courseId] : permittedCourseIds;
    const courseQuery: Record<string, unknown> = {
      universityId: actor.universityId,
      ...(requestedCourseIds ? { _id: { $in: requestedCourseIds } } : {}),
    };
    const rawCourses = await CourseModel.find(courseQuery)
      .select('code title departmentId attendanceRequirement')
      .sort({ code: 1 })
      .lean()
      .exec();
    const departmentIds = [...new Set(rawCourses.map((course) => id(course.departmentId)))];
    const departments = await DepartmentModel.find({
      universityId: actor.universityId,
      _id: { $in: departmentIds },
    })
      .select('name facultyName')
      .lean()
      .exec();
    const departmentMap = new Map(
      departments.map((department) => [
        id(department._id),
        { name: department.name, facultyName: department.facultyName },
      ]),
    );
    const courses = rawCourses.map((course) => {
      const department = departmentMap.get(id(course.departmentId));
      return {
        id: id(course._id),
        code: course.code,
        title: course.title,
        departmentId: id(course.departmentId),
        departmentName: department?.name ?? 'Unassigned department',
        facultyName: department?.facultyName ?? 'Unassigned faculty',
        attendanceRequirement: course.attendanceRequirement,
      };
    });
    const courseIds = courses.map((course) => course.id);
    const rawSessions = await AttendanceSessionModel.find({
      universityId: actor.universityId,
      courseId: { $in: courseIds },
      openedAt: { $gte: from, $lte: to },
    })
      .select('courseId openedAt status')
      .sort({ openedAt: 1 })
      .lean()
      .exec();
    const sessions = rawSessions.map((session) => ({
      id: id(session._id),
      courseId: id(session.courseId),
      openedAt: session.openedAt,
      status: session.status,
    }));
    const studentScope = actor.role === 'student' ? actor.id : options.studentId;
    const rawRegistrations = await CourseRegistrationModel.find({
      universityId: actor.universityId,
      courseId: { $in: courseIds },
      status: 'approved',
      ...(studentScope ? { studentId: studentScope } : {}),
    })
      .select('courseId studentId registrationNumber')
      .lean()
      .exec();
    const registrations = rawRegistrations.map((registration) => ({
      id: id(registration._id),
      courseId: id(registration.courseId),
      studentId: id(registration.studentId),
      registrationNumber: registration.registrationNumber,
    }));
    const sessionIds = sessions.map((session) => session.id);
    const registrationStudents = new Set(
      registrations.map((registration) => registration.studentId),
    );
    const rawRecords = sessionIds.length
      ? await AttendanceRecordModel.find({
          universityId: actor.universityId,
          sessionId: { $in: sessionIds },
          ...(studentScope ? { studentId: studentScope } : {}),
        })
          .select('sessionId courseId studentId checkedInAt status gps faceVerification')
          .sort({ checkedInAt: -1 })
          .lean()
          .exec()
      : [];
    const records = rawRecords
      .filter((record) => registrationStudents.has(id(record.studentId)))
      .map((record) => ({
        id: id(record._id),
        sessionId: id(record.sessionId),
        courseId: id(record.courseId),
        studentId: id(record.studentId),
        checkedInAt: record.checkedInAt,
        status: 'present' as const,
        gpsVerified: record.gps?.verified ?? false,
        faceVerified: record.faceVerification?.verified ?? false,
      }));
    const studentIds = [...registrationStudents];
    const rawStudents = await UserModel.find({
      universityId: actor.universityId,
      _id: { $in: studentIds },
      role: 'student',
    })
      .select('firstName lastName')
      .lean()
      .exec();
    const students = rawStudents.map((student) => ({
      id: id(student._id),
      fullName: `${student.firstName} ${student.lastName}`,
    }));
    return { courses, sessions, registrations, records, students };
  }
}

export const analyticsRepository = new AnalyticsRepository();
