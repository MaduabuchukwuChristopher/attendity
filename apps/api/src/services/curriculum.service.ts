import { createHash } from 'node:crypto';
import type { CurriculumMappingSummary, RequestActor } from '@qr/types';
import { CourseModel } from '../models/course.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { CurriculumMappingModel } from '../models/curriculum-mapping.model.js';
import { InstitutionStructureModel } from '../models/institution-structure.model.js';
import { StudentProfileModel } from '../models/student-profile.model.js';
import type {
  CreateCurriculumMappingInput,
  UpdateCurriculumMappingInput,
} from '../validators/curriculum.validator.js';
import { auditService } from './audit.service.js';

function statusError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export function deterministicRegistrationReference(
  studentId: string,
  courseId: string,
  termId: string,
): string {
  const digest = createHash('sha256')
    .update(`${studentId}:${courseId}:${termId}`)
    .digest('hex')
    .slice(0, 20)
    .toUpperCase();
  return `AUTO-${digest}`;
}

function mappingView(record: Record<string, unknown>): CurriculumMappingSummary {
  return {
    id: String(record._id),
    courseId: String(record.courseId),
    programmeId: String(record.programmeId),
    levelId: String(record.levelId),
    termId: String(record.termId),
    classification: record.classification as 'core' | 'elective',
    status: record.status as 'active' | 'inactive',
  };
}

export class CurriculumService {
  async list(actor: RequestActor): Promise<readonly Record<string, unknown>[]> {
    return CurriculumMappingModel.find({ universityId: actor.universityId })
      .populate('courseId', 'code title creditUnits status')
      .populate('programmeId', 'code name kind')
      .populate('levelId', 'code name kind')
      .populate('termId', 'code name startsAt endsAt isCurrent status')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  private async assertReferences(actor: RequestActor, input: CreateCurriculumMappingInput) {
    const [course, structures] = await Promise.all([
      CourseModel.exists({
        _id: input.courseId,
        universityId: actor.universityId,
        status: 'active',
      }),
      InstitutionStructureModel.find({
        _id: { $in: [input.programmeId, input.levelId, input.termId] },
        universityId: actor.universityId,
        status: 'active',
      })
        .select('kind parentId')
        .lean()
        .exec(),
    ]);
    if (!course) throw statusError('The selected active course was not found.', 422);
    const byId = new Map(structures.map((item) => [String(item._id), item]));
    const programme = byId.get(input.programmeId);
    const level = byId.get(input.levelId);
    const term = byId.get(input.termId);
    if (programme?.kind !== 'programme')
      throw statusError('The selected programme is unavailable.', 422);
    if (level?.kind !== 'level' || String(level.parentId) !== input.programmeId)
      throw statusError('The selected level does not belong to that programme.', 422);
    if (term?.kind !== 'term') throw statusError('The selected academic term is unavailable.', 422);
  }

  async create(
    actor: RequestActor,
    input: CreateCurriculumMappingInput,
  ): Promise<CurriculumMappingSummary> {
    await this.assertReferences(actor, input);
    const existing = await CurriculumMappingModel.findOne({
      universityId: actor.universityId,
      courseId: input.courseId,
      programmeId: input.programmeId,
      levelId: input.levelId,
      termId: input.termId,
    }).exec();
    if (existing) {
      if (existing.status === 'active')
        throw statusError('This course is already mapped to the selected curriculum.', 409);
      const oldValue = existing.toJSON();
      existing.set({ classification: input.classification, status: 'active', updatedBy: actor.id });
      await existing.save();
      await auditService.record({
        action: 'curriculum_mapping.reactivated',
        resourceType: 'curriculum_mapping',
        resourceId: existing.id,
        actor,
        oldValue,
        newValue: existing.toJSON(),
      });
      return mappingView(existing.toJSON());
    }
    const mapping = await CurriculumMappingModel.create({
      ...input,
      universityId: actor.universityId,
      status: 'active',
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.record({
      action: 'curriculum_mapping.created',
      resourceType: 'curriculum_mapping',
      resourceId: mapping.id,
      actor,
      newValue: mapping.toJSON(),
    });
    return mappingView(mapping.toJSON());
  }

  async update(
    actor: RequestActor,
    mappingId: string,
    input: UpdateCurriculumMappingInput,
  ): Promise<CurriculumMappingSummary> {
    const mapping = await CurriculumMappingModel.findOne({
      _id: mappingId,
      universityId: actor.universityId,
    }).exec();
    if (!mapping) throw statusError('Curriculum mapping was not found.', 404);
    const oldValue = mapping.toJSON();
    mapping.set({ classification: input.classification, updatedBy: actor.id });
    await mapping.save();
    await auditService.record({
      action: 'curriculum_mapping.updated',
      resourceType: 'curriculum_mapping',
      resourceId: mapping.id,
      actor,
      oldValue,
      newValue: mapping.toJSON(),
    });
    return mappingView(mapping.toJSON());
  }

  async deactivate(actor: RequestActor, mappingId: string): Promise<CurriculumMappingSummary> {
    const mapping = await CurriculumMappingModel.findOne({
      _id: mappingId,
      universityId: actor.universityId,
    }).exec();
    if (!mapping) throw statusError('Curriculum mapping was not found.', 404);
    const oldValue = mapping.toJSON();
    mapping.set({ status: 'inactive', updatedBy: actor.id });
    await mapping.save();
    await auditService.record({
      action: 'curriculum_mapping.deactivated',
      resourceType: 'curriculum_mapping',
      resourceId: mapping.id,
      actor,
      oldValue,
      newValue: mapping.toJSON(),
    });
    return mappingView(mapping.toJSON());
  }

  private async currentTermIds(universityId: string): Promise<readonly string[]> {
    const now = new Date();
    const terms = await InstitutionStructureModel.find({
      universityId,
      kind: 'term',
      status: 'active',
      $or: [{ isCurrent: true }, { startsAt: { $lte: now }, endsAt: { $gte: now } }],
    })
      .select('_id')
      .lean()
      .exec();
    return terms.map((term) => String(term._id));
  }

  private async studentContext(actor: RequestActor) {
    if (actor.role !== 'student')
      throw statusError('Only students have curriculum recommendations.', 403);
    const profile = await StudentProfileModel.findOne({
      universityId: actor.universityId,
      userId: actor.id,
    })
      .lean()
      .exec();
    if (!profile)
      throw statusError('Complete your academic profile to view course recommendations.', 409);
    return profile;
  }

  async recommendForStudent(actor: RequestActor): Promise<readonly Record<string, unknown>[]> {
    const [profile, termIds] = await Promise.all([
      this.studentContext(actor),
      this.currentTermIds(actor.universityId),
    ]);
    if (!termIds.length) return [];
    return CurriculumMappingModel.find({
      universityId: actor.universityId,
      programmeId: profile.programmeId,
      levelId: profile.levelId,
      termId: { $in: termIds },
      status: 'active',
    })
      .populate('courseId', 'code title creditUnits attendanceRequirement status')
      .populate('termId', 'code name startsAt endsAt')
      .sort({ classification: 1, createdAt: 1 })
      .lean()
      .exec();
  }

  async reconcileCoreRegistrations(actor: RequestActor): Promise<{
    readonly approvedCoreCourseIds: readonly string[];
    readonly reviewCourseIds: readonly string[];
  }> {
    const [profile, termIds] = await Promise.all([
      this.studentContext(actor),
      this.currentTermIds(actor.universityId),
    ]);
    const mappings = termIds.length
      ? await CurriculumMappingModel.find({
          universityId: actor.universityId,
          programmeId: profile.programmeId,
          levelId: profile.levelId,
          termId: { $in: termIds },
          classification: 'core',
          status: 'active',
        })
          .select('courseId termId')
          .lean()
          .exec()
      : [];
    const courseIds = [...new Set(mappings.map((mapping) => String(mapping.courseId)))];
    const activeCourses = await CourseModel.find({
      _id: { $in: courseIds },
      universityId: actor.universityId,
      status: 'active',
    })
      .select('_id')
      .lean()
      .exec();
    const activeCourseIds = new Set(activeCourses.map((course) => String(course._id)));
    for (const mapping of mappings) {
      const courseId = String(mapping.courseId);
      if (!activeCourseIds.has(courseId)) continue;
      const registrationNumber = deterministicRegistrationReference(
        actor.id,
        courseId,
        String(mapping.termId),
      );
      const previous = await CourseRegistrationModel.findOne({
        universityId: actor.universityId,
        studentId: actor.id,
        courseId,
      })
        .lean()
        .exec();
      if (
        previous?.registrationNumber === registrationNumber &&
        previous.source === 'core' &&
        previous.status === 'approved'
      )
        continue;
      const registration = await CourseRegistrationModel.findOneAndUpdate(
        { universityId: actor.universityId, studentId: actor.id, courseId },
        {
          $set: {
            registrationNumber,
            source: 'core',
            status: 'approved',
            updatedBy: actor.id,
          },
          $unset: { reviewedBy: 1, reviewedAt: 1, reviewNote: 1, requestedReason: 1 },
          $setOnInsert: {
            universityId: actor.universityId,
            studentId: actor.id,
            courseId,
            createdBy: actor.id,
          },
        },
        { upsert: true, new: true, runValidators: true },
      ).exec();
      if (!registration)
        throw statusError('Core course registration could not be reconciled.', 500);
      await auditService.record({
        action: previous
          ? 'course_registration.core_reconciled'
          : 'course_registration.core_created',
        resourceType: 'course_registration',
        resourceId: registration.id,
        actor,
        ...(previous ? { oldValue: previous } : {}),
        newValue: registration.toJSON(),
      });
    }
    const approvedCoreCourseIds = [...activeCourseIds];
    const incompatible = await CourseRegistrationModel.find({
      universityId: actor.universityId,
      studentId: actor.id,
      source: 'core',
      status: 'approved',
      ...(approvedCoreCourseIds.length ? { courseId: { $nin: approvedCoreCourseIds } } : {}),
    }).exec();
    for (const registration of incompatible) {
      const oldValue = registration.toJSON();
      registration.set({
        status: 'pending',
        reviewNote: 'Academic profile changed; an administrator must review this registration.',
        updatedBy: actor.id,
      });
      await registration.save();
      await auditService.record({
        action: 'course_registration.review_required',
        resourceType: 'course_registration',
        resourceId: registration.id,
        actor,
        oldValue,
        newValue: registration.toJSON(),
      });
    }
    return {
      approvedCoreCourseIds,
      reviewCourseIds: incompatible.map((registration) => String(registration.courseId)),
    };
  }
}

export const curriculumService = new CurriculumService();
