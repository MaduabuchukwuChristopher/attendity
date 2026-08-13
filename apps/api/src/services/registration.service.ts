import type { RequestActor } from '@qr/types';
import type { PopulateOptions } from 'mongoose';
import { CourseModel } from '../models/course.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { UserModel } from '../models/user.model.js';
import { auditService } from './audit.service.js';
import { clearanceService } from './clearance.service.js';
import { curriculumService, deterministicRegistrationReference } from './curriculum.service.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';

interface CreateRegistrationValues {
  readonly studentId: string;
  readonly courseId: string;
  readonly registrationNumber: string;
}

type RegistrationStatus = 'approved' | 'withdrawn';

const registrationPopulation: PopulateOptions[] = [
  { path: 'studentId', select: 'firstName lastName email accountStatus' },
  { path: 'courseId', select: 'code title creditUnits attendanceRequirement status' },
];

export class RegistrationService {
  async list(universityId: string): Promise<readonly Record<string, unknown>[]> {
    const registrations = await CourseRegistrationModel.find({ universityId })
      .populate(registrationPopulation)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return registrations;
  }

  async listMine(
    universityId: string,
    studentId: string,
  ): Promise<readonly Record<string, unknown>[]> {
    const registrations = await CourseRegistrationModel.find({
      universityId,
      studentId,
    })
      .populate('courseId', 'code title creditUnits attendanceRequirement')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return registrations;
  }

  async recommendations(actor: RequestActor) {
    return curriculumService.recommendForStudent(actor);
  }

  async reconcile(actor: RequestActor) {
    return curriculumService.reconcileCoreRegistrations(actor);
  }

  private referencedId(value: unknown): string {
    if (value && typeof value === 'object' && '_id' in value) return String(value._id);
    return String(value);
  }

  async selectElective(actor: RequestActor, courseId: string) {
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can select elective courses.'), {
        statusCode: 403,
      });
    const [recommendations, settings] = await Promise.all([
      curriculumService.recommendForStudent(actor),
      SystemSettingsModel.findOne({ universityId: actor.universityId })
        .select('electiveRegistrationRequiresApproval')
        .lean()
        .exec(),
    ]);
    const mapping = recommendations.find(
      (item) => item.classification === 'elective' && this.referencedId(item.courseId) === courseId,
    );
    if (!mapping)
      throw Object.assign(new Error('This course is not an available curriculum elective.'), {
        statusCode: 409,
      });
    const status =
      settings?.electiveRegistrationRequiresApproval === false ? 'approved' : 'pending';
    const existing = await CourseRegistrationModel.findOne({
      universityId: actor.universityId,
      studentId: actor.id,
      courseId,
    }).exec();
    if (existing && existing.status !== 'withdrawn' && existing.status !== 'rejected')
      throw Object.assign(new Error('A registration already exists for this course.'), {
        statusCode: 409,
      });
    const oldValue = existing?.toJSON();
    const registration = await CourseRegistrationModel.findOneAndUpdate(
      { universityId: actor.universityId, studentId: actor.id, courseId },
      {
        $set: {
          registrationNumber: deterministicRegistrationReference(
            actor.id,
            courseId,
            this.referencedId(mapping.termId),
          ),
          source: 'elective',
          status,
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
      throw Object.assign(new Error('Elective registration could not be saved.'), {
        statusCode: 500,
      });
    await auditService.record({
      action: 'course_registration.elective_selected',
      resourceType: 'course_registration',
      resourceId: registration.id,
      actor,
      ...(oldValue ? { oldValue } : {}),
      newValue: registration.toJSON(),
    });
    return registration.toJSON();
  }

  async withdrawElective(actor: RequestActor, registrationId: string) {
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can manage elective registrations.'), {
        statusCode: 403,
      });
    const registration = await CourseRegistrationModel.findOne({
      _id: registrationId,
      universityId: actor.universityId,
      studentId: actor.id,
      source: 'elective',
    }).exec();
    if (!registration)
      throw Object.assign(new Error('Elective registration was not found.'), { statusCode: 404 });
    if (!['pending', 'approved'].includes(registration.status))
      throw Object.assign(new Error('This elective cannot be withdrawn in its current state.'), {
        statusCode: 409,
      });
    const oldValue = registration.toJSON();
    registration.set({ status: 'withdrawn', updatedBy: actor.id });
    await registration.save();
    await clearanceService.expireForRegistration(
      actor,
      String(registration.studentId),
      String(registration.courseId),
    );
    await auditService.record({
      action: 'course_registration.elective_withdrawn',
      resourceType: 'course_registration',
      resourceId: registration.id,
      actor,
      oldValue,
      newValue: registration.toJSON(),
    });
    return registration.toJSON();
  }

  private async borrowed(actor: RequestActor, registrationId: string) {
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can manage borrowed-course requests.'), {
        statusCode: 403,
      });
    const registration = await CourseRegistrationModel.findOne({
      _id: registrationId,
      universityId: actor.universityId,
      studentId: actor.id,
      source: 'borrowed',
    }).exec();
    if (!registration)
      throw Object.assign(new Error('Borrowed-course request was not found.'), { statusCode: 404 });
    return registration;
  }

  async requestBorrowed(actor: RequestActor, courseId: string, reason: string) {
    if (actor.role !== 'student')
      throw Object.assign(new Error('Only students can request borrowed courses.'), {
        statusCode: 403,
      });
    const [course, recommendations, existing] = await Promise.all([
      CourseModel.exists({ _id: courseId, universityId: actor.universityId, status: 'active' }),
      curriculumService.recommendForStudent(actor),
      CourseRegistrationModel.findOne({
        universityId: actor.universityId,
        studentId: actor.id,
        courseId,
      })
        .select('_id source status')
        .lean()
        .exec(),
    ]);
    if (!course)
      throw Object.assign(new Error('The selected active course was not found.'), {
        statusCode: 422,
      });
    const assigned = recommendations.find(
      (mapping) => this.referencedId(mapping.courseId) === courseId,
    );
    if (assigned)
      throw Object.assign(
        new Error(
          assigned.classification === 'core'
            ? 'This course is already assigned as a core course.'
            : 'Use the elective selection flow for this course.',
        ),
        { statusCode: 409 },
      );
    if (existing)
      throw Object.assign(new Error('A registration already exists for this course.'), {
        statusCode: 409,
      });
    const registration = await CourseRegistrationModel.create({
      universityId: actor.universityId,
      studentId: actor.id,
      courseId,
      registrationNumber: deterministicRegistrationReference(actor.id, courseId, 'borrowed'),
      source: 'borrowed',
      status: 'pending',
      requestedReason: reason,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.record({
      action: 'course_registration.borrowed_submitted',
      resourceType: 'course_registration',
      resourceId: registration.id,
      actor,
      newValue: registration.toJSON(),
    });
    await registration.populate('courseId', 'code title creditUnits attendanceRequirement');
    return registration.toJSON();
  }

  async updateBorrowed(actor: RequestActor, registrationId: string, reason: string) {
    const registration = await this.borrowed(actor, registrationId);
    if (registration.status !== 'pending')
      throw Object.assign(new Error('Only pending requests can be edited.'), { statusCode: 409 });
    const oldValue = registration.toJSON();
    registration.set({ requestedReason: reason, updatedBy: actor.id });
    await registration.save();
    await auditService.record({
      action: 'course_registration.borrowed_updated',
      resourceType: 'course_registration',
      resourceId: registration.id,
      actor,
      oldValue,
      newValue: registration.toJSON(),
    });
    return registration.toJSON();
  }

  async withdrawBorrowed(actor: RequestActor, registrationId: string) {
    const registration = await this.borrowed(actor, registrationId);
    if (!['pending', 'approved'].includes(registration.status))
      throw Object.assign(new Error('This request cannot be withdrawn in its current state.'), {
        statusCode: 409,
      });
    const oldValue = registration.toJSON();
    registration.set({ status: 'withdrawn', updatedBy: actor.id });
    await registration.save();
    await clearanceService.expireForRegistration(
      actor,
      String(registration.studentId),
      String(registration.courseId),
    );
    await auditService.record({
      action: 'course_registration.borrowed_withdrawn',
      resourceType: 'course_registration',
      resourceId: registration.id,
      actor,
      oldValue,
      newValue: registration.toJSON(),
    });
    return registration.toJSON();
  }

  async resubmitBorrowed(actor: RequestActor, registrationId: string, reason?: string) {
    const registration = await this.borrowed(actor, registrationId);
    if (!['rejected', 'withdrawn'].includes(registration.status))
      throw Object.assign(new Error('Only rejected or withdrawn requests can be resubmitted.'), {
        statusCode: 409,
      });
    const oldValue = registration.toJSON();
    registration.set({
      status: 'pending',
      ...(reason ? { requestedReason: reason } : {}),
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNote: undefined,
      updatedBy: actor.id,
    });
    await registration.save();
    await auditService.record({
      action: 'course_registration.borrowed_resubmitted',
      resourceType: 'course_registration',
      resourceId: registration.id,
      actor,
      oldValue,
      newValue: registration.toJSON(),
    });
    return registration.toJSON();
  }

  async reviewBorrowed(
    actor: RequestActor,
    registrationId: string,
    decision: 'approve' | 'reject',
    note: string,
  ) {
    const registration = await CourseRegistrationModel.findOne({
      _id: registrationId,
      universityId: actor.universityId,
      source: 'borrowed',
      status: 'pending',
    }).exec();
    if (!registration)
      throw Object.assign(new Error('Pending borrowed-course request was not found.'), {
        statusCode: 404,
      });
    const oldValue = registration.toJSON();
    registration.set({
      status: decision === 'approve' ? 'approved' : 'rejected',
      reviewNote: note,
      reviewedBy: actor.id,
      reviewedAt: new Date(),
      updatedBy: actor.id,
    });
    await registration.save();
    await auditService.record({
      action: `course_registration.borrowed_${decision}d`,
      resourceType: 'course_registration',
      resourceId: registration.id,
      actor,
      oldValue,
      newValue: registration.toJSON(),
    });
    return registration.toJSON();
  }

  async create(
    actor: RequestActor,
    values: CreateRegistrationValues,
  ): Promise<Record<string, unknown>> {
    const [student, course, existing] = await Promise.all([
      UserModel.findOne({
        _id: values.studentId,
        universityId: actor.universityId,
        role: 'student',
      })
        .select('_id accountStatus')
        .lean()
        .exec(),
      CourseModel.findOne({
        _id: values.courseId,
        universityId: actor.universityId,
        status: 'active',
      })
        .select('_id')
        .lean()
        .exec(),
      CourseRegistrationModel.findOne({
        universityId: actor.universityId,
        studentId: values.studentId,
        courseId: values.courseId,
      })
        .select('_id')
        .lean()
        .exec(),
    ]);

    if (!student)
      throw Object.assign(new Error('Student was not found in this institution.'), {
        statusCode: 422,
      });
    if (student.accountStatus !== 'active')
      throw Object.assign(new Error('Only active students can be registered.'), {
        statusCode: 422,
      });
    if (!course)
      throw Object.assign(new Error('Active course was not found in this institution.'), {
        statusCode: 422,
      });
    if (existing)
      throw Object.assign(new Error('The student is already registered for this course.'), {
        statusCode: 409,
      });

    const registration = await CourseRegistrationModel.create({
      ...values,
      universityId: actor.universityId,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.record({
      action: 'course_registration.created',
      resourceType: 'course_registration',
      resourceId: registration.id,
      actor,
      newValue: registration.toJSON(),
    });
    await registration.populate(registrationPopulation);
    return registration.toJSON();
  }

  async updateStatus(
    actor: RequestActor,
    registrationId: string,
    status: RegistrationStatus,
  ): Promise<Record<string, unknown>> {
    const registration = await CourseRegistrationModel.findOne({
      _id: registrationId,
      universityId: actor.universityId,
    }).exec();
    if (!registration)
      throw Object.assign(new Error('Course registration was not found.'), { statusCode: 404 });

    const oldValue = registration.toJSON();
    registration.set({ status, updatedBy: actor.id });
    await registration.save();
    await clearanceService.expireForRegistration(
      actor,
      String(registration.studentId),
      String(registration.courseId),
    );
    await auditService.record({
      action: `course_registration.${status}`,
      resourceType: 'course_registration',
      resourceId: registration.id,
      actor,
      oldValue,
      newValue: registration.toJSON(),
    });
    await registration.populate(registrationPopulation);
    return registration.toJSON();
  }
}

export const registrationService = new RegistrationService();
