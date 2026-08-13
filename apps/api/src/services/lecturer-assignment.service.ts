import type { LecturerAssignmentSummary, RequestActor } from '@qr/types';
import { CourseModel } from '../models/course.model.js';
import { InstitutionStructureModel } from '../models/institution-structure.model.js';
import { LecturerAssignmentModel } from '../models/lecturer-assignment.model.js';
import { UserModel } from '../models/user.model.js';
import type { CreateLecturerAssignmentInput } from '../validators/curriculum.validator.js';
import { auditService } from './audit.service.js';

function statusError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function assignmentView(record: Record<string, unknown>): LecturerAssignmentSummary {
  return {
    id: String(record._id),
    lecturerId: String(record.lecturerId),
    courseId: String(record.courseId),
    academicSessionId: String(record.academicSessionId),
    termId: String(record.termId),
    assignmentRole: record.assignmentRole as 'primary' | 'co_lecturer',
    status: record.status as 'active' | 'inactive',
  };
}

export class LecturerAssignmentService {
  async list(actor: RequestActor): Promise<readonly Record<string, unknown>[]> {
    return LecturerAssignmentModel.find({
      universityId: actor.universityId,
      ...(actor.role === 'lecturer' ? { lecturerId: actor.id } : {}),
    })
      .populate('lecturerId', 'firstName lastName email accountStatus')
      .populate('courseId', 'code title status')
      .populate('academicSessionId', 'code name startsAt endsAt')
      .populate('termId', 'code name startsAt endsAt isCurrent')
      .sort({ startsAt: -1, createdAt: -1 })
      .lean()
      .exec();
  }

  async assign(
    actor: RequestActor,
    input: CreateLecturerAssignmentInput,
  ): Promise<LecturerAssignmentSummary> {
    const [lecturer, course, structures] = await Promise.all([
      UserModel.exists({
        _id: input.lecturerId,
        universityId: actor.universityId,
        role: 'lecturer',
        accountStatus: 'active',
      }),
      CourseModel.exists({
        _id: input.courseId,
        universityId: actor.universityId,
        status: 'active',
      }),
      InstitutionStructureModel.find({
        _id: { $in: [input.academicSessionId, input.termId] },
        universityId: actor.universityId,
        status: 'active',
      })
        .select('kind parentId startsAt endsAt')
        .lean()
        .exec(),
    ]);
    if (!lecturer) throw statusError('The selected active lecturer was not found.', 422);
    if (!course) throw statusError('The selected active course was not found.', 422);
    const byId = new Map(structures.map((item) => [String(item._id), item]));
    const academicSession = byId.get(input.academicSessionId);
    const term = byId.get(input.termId);
    if (academicSession?.kind !== 'academic_session')
      throw statusError('The selected academic session is unavailable.', 422);
    if (
      term?.kind !== 'term' ||
      (term.parentId && String(term.parentId) !== input.academicSessionId)
    )
      throw statusError('The selected term does not belong to that academic session.', 422);
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if ((term.startsAt && startsAt < term.startsAt) || (term.endsAt && endsAt > term.endsAt))
      throw statusError('Assignment dates must fall within the selected term.', 422);
    const existing = await LecturerAssignmentModel.findOne({
      universityId: actor.universityId,
      lecturerId: input.lecturerId,
      courseId: input.courseId,
      termId: input.termId,
    }).exec();
    if (existing?.status === 'active')
      throw statusError(
        'This lecturer already has an active assignment for the course and term.',
        409,
      );
    const oldValue = existing?.toJSON();
    const assignment = await LecturerAssignmentModel.findOneAndUpdate(
      {
        universityId: actor.universityId,
        lecturerId: input.lecturerId,
        courseId: input.courseId,
        termId: input.termId,
      },
      {
        $set: {
          ...input,
          startsAt,
          endsAt,
          status: 'active',
          updatedBy: actor.id,
        },
        $setOnInsert: { universityId: actor.universityId, createdBy: actor.id },
      },
      { upsert: true, new: true, runValidators: true },
    ).exec();
    if (!assignment) throw statusError('Lecturer assignment could not be saved.', 500);
    await auditService.record({
      action: oldValue ? 'lecturer_assignment.reactivated' : 'lecturer_assignment.created',
      resourceType: 'lecturer_assignment',
      resourceId: assignment.id,
      actor,
      ...(oldValue ? { oldValue } : {}),
      newValue: assignment.toJSON(),
    });
    return assignmentView(assignment.toJSON());
  }

  async deactivate(actor: RequestActor, assignmentId: string): Promise<LecturerAssignmentSummary> {
    const assignment = await LecturerAssignmentModel.findOne({
      _id: assignmentId,
      universityId: actor.universityId,
    }).exec();
    if (!assignment) throw statusError('Lecturer assignment was not found.', 404);
    const oldValue = assignment.toJSON();
    assignment.set({ status: 'inactive', updatedBy: actor.id });
    await assignment.save();
    await auditService.record({
      action: 'lecturer_assignment.deactivated',
      resourceType: 'lecturer_assignment',
      resourceId: assignment.id,
      actor,
      oldValue,
      newValue: assignment.toJSON(),
    });
    return assignmentView(assignment.toJSON());
  }

  async activeCourseIds(actor: RequestActor, at = new Date()): Promise<readonly string[]> {
    if (actor.role !== 'lecturer') return [];
    const activeFilter = {
      universityId: actor.universityId,
      status: 'active' as const,
      startsAt: { $lte: at },
      endsAt: { $gte: at },
    };
    const [ownAssignments, allAssignments] = await Promise.all([
      LecturerAssignmentModel.find({ ...activeFilter, lecturerId: actor.id })
        .select('courseId')
        .lean()
        .exec(),
      LecturerAssignmentModel.find(activeFilter).select('courseId').lean().exec(),
    ]);
    const assignedToActor = ownAssignments.map((assignment) => String(assignment.courseId));
    const assignedForPeriod = [
      ...new Set(allAssignments.map((assignment) => String(assignment.courseId))),
    ];
    const legacyCourses = await CourseModel.find({
      universityId: actor.universityId,
      lecturerId: actor.id,
      status: 'active',
      ...(assignedForPeriod.length ? { _id: { $nin: assignedForPeriod } } : {}),
    })
      .select('_id')
      .lean()
      .exec();
    return [...new Set([...assignedToActor, ...legacyCourses.map((course) => String(course._id))])];
  }

  async assertActiveAssignment(
    actor: RequestActor,
    courseId: string,
    at = new Date(),
  ): Promise<void> {
    const courseIds = await this.activeCourseIds(actor, at);
    if (!courseIds.includes(courseId))
      throw statusError(
        'This course is not assigned to the current lecturer for this period.',
        403,
      );
  }
}

export const lecturerAssignmentService = new LecturerAssignmentService();
