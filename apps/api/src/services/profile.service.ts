import type { LecturerProfile, RequestActor, StudentProfile, UserRole } from '@qr/types';
import { Types } from 'mongoose';
import { DepartmentModel } from '../models/department.model.js';
import { CourseModel } from '../models/course.model.js';
import { InstitutionStructureModel } from '../models/institution-structure.model.js';
import { LecturerAssignmentModel } from '../models/lecturer-assignment.model.js';
import { LecturerProfileModel } from '../models/lecturer-profile.model.js';
import { StudentProfileModel } from '../models/student-profile.model.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';
import { UserModel } from '../models/user.model.js';
import type {
  UpdateLecturerProfileInput,
  UpdateStudentProfileInput,
} from '../validators/profile.validator.js';
import { auditService } from './audit.service.js';
import { mediaUploadService } from './media-upload.service.js';
import { curriculumService } from './curriculum.service.js';

function statusError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export function validateStudentIdentifier(value: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, 'i').test(value.trim());
  } catch {
    return false;
  }
}

export function canReadProfileOptions(role: UserRole): boolean {
  return role === 'student' || role === 'lecturer';
}

function date(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(0).toISOString();
}

function studentView(record: Record<string, unknown>): StudentProfile {
  const photoAssetId = record.photoAssetId;
  return {
    id: String(record._id),
    userId: String(record.userId),
    matricNumber: String(record.matricNumber),
    campusId: String(record.campusId),
    facultyId: String(record.facultyId),
    departmentId: String(record.departmentId),
    programmeId: String(record.programmeId),
    levelId: String(record.levelId),
    admissionSessionId: String(record.admissionSessionId),
    ...(typeof photoAssetId === 'string'
      ? { photoAssetId }
      : photoAssetId instanceof Types.ObjectId
        ? { photoAssetId: photoAssetId.toHexString() }
        : {}),
    completionPercentage: 100,
    missingFields: [],
    updatedAt: date(record.updatedAt),
  };
}

function lecturerView(record: Record<string, unknown>): LecturerProfile {
  const optional = (key: string) => {
    const value = record[key];
    if (typeof value === 'string') return value;
    return value instanceof Types.ObjectId ? value.toHexString() : undefined;
  };
  const required = ['employeeNumber', 'departmentId'];
  const missingFields = required.filter((field) => !record[field]);
  return {
    id: String(record._id),
    userId: String(record.userId),
    ...(optional('employeeNumber') ? { employeeNumber: optional('employeeNumber')! } : {}),
    ...(optional('title') ? { title: optional('title')! } : {}),
    ...(optional('campusId') ? { campusId: optional('campusId')! } : {}),
    ...(optional('facultyId') ? { facultyId: optional('facultyId')! } : {}),
    ...(optional('departmentId') ? { departmentId: optional('departmentId')! } : {}),
    ...(optional('office') ? { office: optional('office')! } : {}),
    ...(optional('biography') ? { biography: optional('biography')! } : {}),
    ...(optional('photoAssetId') ? { photoAssetId: optional('photoAssetId')! } : {}),
    completionPercentage: Math.round(
      ((required.length - missingFields.length) / required.length) * 100,
    ),
    missingFields,
    updatedAt: date(record.updatedAt),
  };
}

export class ProfileService {
  private async user(actor: RequestActor) {
    const user = await UserModel.findOne({
      _id: actor.id,
      universityId: actor.universityId,
    }).exec();
    if (!user) throw statusError('User account was not found.', 404);
    return user;
  }

  async mine(actor: RequestActor) {
    const user = await this.user(actor);
    if (actor.role === 'student') {
      const profile = await StudentProfileModel.findOne({
        universityId: actor.universityId,
        userId: actor.id,
      })
        .lean()
        .exec();
      return {
        role: actor.role,
        user: user.toJSON(),
        profile: profile ? studentView(profile) : null,
      };
    }
    if (actor.role === 'lecturer') {
      const [profile, assignments] = await Promise.all([
        LecturerProfileModel.findOne({ universityId: actor.universityId, userId: actor.id })
          .lean()
          .exec(),
        LecturerAssignmentModel.find({
          universityId: actor.universityId,
          lecturerId: actor.id,
          status: 'active',
        })
          .populate('courseId', 'code title')
          .populate('termId', 'code name')
          .lean()
          .exec(),
      ]);
      return {
        role: actor.role,
        user: user.toJSON(),
        profile: profile ? lecturerView(profile) : null,
        assignments,
      };
    }
    return { role: actor.role, user: user.toJSON(), profile: null };
  }

  async options(actor: RequestActor) {
    if (!canReadProfileOptions(actor.role))
      throw statusError('Academic profile options are available to students and lecturers.', 403);
    const [structures, departments, courses] = await Promise.all([
      InstitutionStructureModel.find({ universityId: actor.universityId, status: 'active' })
        .populate('parentId', 'kind code name')
        .sort({ kind: 1, name: 1 })
        .lean()
        .exec(),
      DepartmentModel.find({ universityId: actor.universityId, status: 'active' })
        .select('code name facultyName')
        .sort({ name: 1 })
        .lean()
        .exec(),
      actor.role === 'student'
        ? CourseModel.find({ universityId: actor.universityId, status: 'active' })
            .select('code title')
            .sort({ code: 1 })
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);
    return {
      structures: structures.map((item) => {
        const parent = item.parentId as unknown as
          { _id: unknown; kind: string; code: string; name: string } | undefined;
        return {
          id: String(item._id),
          kind: item.kind,
          code: item.code,
          name: item.name,
          ...(parent
            ? {
                parent: {
                  id: String(parent._id),
                  kind: parent.kind,
                  code: parent.code,
                  name: parent.name,
                },
              }
            : {}),
          isCurrent: item.isCurrent,
          status: item.status,
          createdAt: date((item as unknown as Record<string, unknown>).createdAt),
          updatedAt: date((item as unknown as Record<string, unknown>).updatedAt),
        };
      }),
      departments,
      courses,
    };
  }

  private async studentHierarchy(actor: RequestActor, input: UpdateStudentProfileInput) {
    const rows = await InstitutionStructureModel.find({
      universityId: actor.universityId,
      _id: {
        $in: [
          input.campusId,
          input.facultyId,
          input.programmeId,
          input.levelId,
          input.admissionSessionId,
        ],
      },
      status: 'active',
    })
      .lean()
      .exec();
    const byId = new Map(rows.map((row) => [String(row._id), row]));
    const campus = byId.get(input.campusId);
    const faculty = byId.get(input.facultyId);
    const programme = byId.get(input.programmeId);
    const level = byId.get(input.levelId);
    const admissionSession = byId.get(input.admissionSessionId);
    if (
      campus?.kind !== 'campus' ||
      faculty?.kind !== 'faculty' ||
      String(faculty.parentId) !== input.campusId
    )
      throw statusError('The selected faculty does not belong to that campus.', 422);
    if (programme?.kind !== 'programme' || String(programme.parentId) !== input.facultyId)
      throw statusError('The selected programme does not belong to that faculty.', 422);
    if (level?.kind !== 'level' || String(level.parentId) !== input.programmeId)
      throw statusError('The selected level does not belong to that programme.', 422);
    if (admissionSession?.kind !== 'academic_session')
      throw statusError('The selected admission session is unavailable.', 422);
    const department = await DepartmentModel.findOne({
      _id: input.departmentId,
      universityId: actor.universityId,
      status: 'active',
    })
      .lean()
      .exec();
    if (!department || department.facultyName !== faculty.name)
      throw statusError('The selected department does not belong to that faculty.', 422);
    return { campus, faculty, programme, level, department };
  }

  async updateStudent(
    actor: RequestActor,
    input: UpdateStudentProfileInput,
  ): Promise<StudentProfile> {
    if (actor.role !== 'student')
      throw statusError('Only students can update a student profile.', 403);
    await mediaUploadService.assertOwnedProfilePhoto(actor, input.photoAssetId, input.photoUrl);
    const [user, hierarchy, settings] = await Promise.all([
      this.user(actor),
      this.studentHierarchy(actor, input),
      SystemSettingsModel.findOne({ universityId: actor.universityId })
        .select('studentIdentifierPattern')
        .lean()
        .exec(),
    ]);
    const pattern = settings?.studentIdentifierPattern ?? '^[A-Z0-9][A-Z0-9/._-]{2,39}$';
    const matricNumber = input.matricNumber.trim().toUpperCase();
    if (!validateStudentIdentifier(matricNumber, pattern))
      throw statusError('The matriculation number does not match your institution format.', 422);
    const duplicate = await StudentProfileModel.exists({
      universityId: actor.universityId,
      matricNumber,
      userId: { $ne: actor.id },
    });
    if (duplicate) throw statusError('This matriculation number is already assigned.', 409);
    const previous = await StudentProfileModel.findOne({
      universityId: actor.universityId,
      userId: actor.id,
    })
      .lean()
      .exec();
    const profile = await StudentProfileModel.findOneAndUpdate(
      { universityId: actor.universityId, userId: actor.id },
      {
        $set: { ...input, matricNumber, completedAt: new Date(), updatedBy: actor.id },
        $setOnInsert: { universityId: actor.universityId, userId: actor.id, createdBy: actor.id },
      },
      { upsert: true, new: true, runValidators: true },
    ).exec();
    await user.updateOne({
      phone: input.phone,
      ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
      matricNumber,
      campus: hierarchy.campus.name,
      facultyName: hierarchy.faculty.name,
      departmentId: input.departmentId,
      programme: hierarchy.programme.name,
      level: hierarchy.level.name,
      updatedBy: actor.id,
    });
    await auditService.record({
      action: 'student_profile.updated',
      resourceType: 'student_profile',
      resourceId: profile.id,
      actor,
      oldValue: previous,
      newValue: profile.toJSON(),
    });
    await curriculumService.reconcileCoreRegistrations(actor);
    return studentView(profile.toJSON());
  }

  async updateLecturer(
    actor: RequestActor,
    input: UpdateLecturerProfileInput,
  ): Promise<LecturerProfile> {
    if (actor.role !== 'lecturer')
      throw statusError('Only lecturers can update a lecturer profile.', 403);
    await mediaUploadService.assertOwnedProfilePhoto(actor, input.photoAssetId, input.photoUrl);
    const user = await this.user(actor);
    if (input.departmentId) {
      const department = await DepartmentModel.exists({
        _id: input.departmentId,
        universityId: actor.universityId,
        status: 'active',
      });
      if (!department) throw statusError('The selected department is unavailable.', 422);
    }
    const duplicate = await LecturerProfileModel.exists({
      universityId: actor.universityId,
      employeeNumber: input.employeeNumber.toUpperCase(),
      userId: { $ne: actor.id },
    });
    if (duplicate) throw statusError('This employee number is already assigned.', 409);
    const previous = await LecturerProfileModel.findOne({
      universityId: actor.universityId,
      userId: actor.id,
    })
      .lean()
      .exec();
    const profile = await LecturerProfileModel.findOneAndUpdate(
      { universityId: actor.universityId, userId: actor.id },
      {
        $set: {
          ...input,
          employeeNumber: input.employeeNumber.toUpperCase(),
          completedAt: input.departmentId ? new Date() : undefined,
          updatedBy: actor.id,
        },
        $setOnInsert: { universityId: actor.universityId, userId: actor.id, createdBy: actor.id },
      },
      { upsert: true, new: true, runValidators: true },
    ).exec();
    await user.updateOne({
      phone: input.phone,
      ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
      ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      updatedBy: actor.id,
    });
    await auditService.record({
      action: 'lecturer_profile.updated',
      resourceType: 'lecturer_profile',
      resourceId: profile.id,
      actor,
      oldValue: previous,
      newValue: profile.toJSON(),
    });
    return lecturerView(profile.toJSON());
  }
}

export const profileService = new ProfileService();
