import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';
import type { RequestActor } from '@qr/types';
import {
  curriculumService,
  deterministicRegistrationReference,
} from '../src/services/curriculum.service.js';
import {
  createCurriculumMappingSchema,
  curriculumMappingIdentifierSchema,
  updateCurriculumMappingSchema,
} from '../src/validators/curriculum.validator.js';
import { CourseModel } from '../src/models/course.model.js';
import { CourseRegistrationModel } from '../src/models/course-registration.model.js';
import { CurriculumMappingModel } from '../src/models/curriculum-mapping.model.js';
import { InstitutionStructureModel } from '../src/models/institution-structure.model.js';
import { StudentProfileModel } from '../src/models/student-profile.model.js';
import { registrationService } from '../src/services/registration.service.js';

const ids = {
  courseId: '507f1f77bcf86cd799439011',
  programmeId: '507f1f77bcf86cd799439012',
  levelId: '507f1f77bcf86cd799439013',
  termId: '507f1f77bcf86cd799439014',
};

async function within<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out during ${label}.`)), 5_000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

void describe('curriculum mapping contracts', () => {
  void it('accepts a complete core or elective mapping', () => {
    for (const classification of ['core', 'elective']) {
      assert.equal(
        createCurriculumMappingSchema.safeParse({ body: { ...ids, classification } }).success,
        true,
      );
    }
  });

  void it('uses strict identifiers and controlled update fields', () => {
    assert.equal(
      curriculumMappingIdentifierSchema.safeParse({ params: { mappingId: ids.courseId } }).success,
      true,
    );
    assert.equal(
      updateCurriculumMappingSchema.safeParse({
        params: { mappingId: ids.courseId },
        body: { classification: 'optional' },
      }).success,
      false,
    );
  });

  void it('creates stable, course-specific registration references', () => {
    const first = deterministicRegistrationReference(ids.programmeId, ids.courseId, ids.termId);
    const second = deterministicRegistrationReference(ids.programmeId, ids.courseId, ids.termId);
    assert.equal(first, second);
    assert.notEqual(
      first,
      deterministicRegistrationReference(ids.programmeId, ids.levelId, ids.termId),
    );
    assert.match(first, /^AUTO-[A-F0-9]{20}$/);
  });

  void it('reconciles core registrations idempotently and blocks duplicate borrowing', async () => {
    await within(mongoose.connect(process.env.MONGODB_URI!), 'database connection');
    const universityId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const programmeId = new mongoose.Types.ObjectId();
    const levelId = new mongoose.Types.ObjectId();
    const termId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const actor: RequestActor = {
      id: String(studentId),
      universityId: String(universityId),
      email: 'student@example.edu',
      fullName: 'Test Student',
      role: 'student',
      sessionId: 'curriculum-test',
      permissions: [],
    };
    try {
      await within(
        InstitutionStructureModel.create([
          {
            _id: programmeId,
            universityId,
            kind: 'programme',
            code: `P${programmeId.toHexString().slice(-6)}`,
            name: 'Test Programme',
            status: 'active',
          },
          {
            _id: levelId,
            universityId,
            kind: 'level',
            code: `L${levelId.toHexString().slice(-6)}`,
            name: 'Test Level',
            parentId: programmeId,
            status: 'active',
          },
          {
            _id: termId,
            universityId,
            kind: 'term',
            code: `T${termId.toHexString().slice(-6)}`,
            name: 'Current Test Term',
            isCurrent: true,
            status: 'active',
          },
        ]),
        'academic structure fixtures',
      );
      await within(
        CourseModel.create({
          _id: courseId,
          universityId,
          code: `C${courseId.toHexString().slice(-6)}`,
          title: 'Test Core Course',
          creditUnits: 3,
          departmentId: new mongoose.Types.ObjectId(),
          attendanceRequirement: 75,
          status: 'active',
        }),
        'course fixture',
      );
      await within(
        StudentProfileModel.create({
          universityId,
          userId: studentId,
          matricNumber: `TEST/${studentId.toHexString().slice(-8)}`,
          campusId: new mongoose.Types.ObjectId(),
          facultyId: new mongoose.Types.ObjectId(),
          departmentId: new mongoose.Types.ObjectId(),
          programmeId,
          levelId,
          admissionSessionId: new mongoose.Types.ObjectId(),
        }),
        'student profile fixture',
      );
      await within(
        CurriculumMappingModel.create({
          universityId,
          courseId,
          programmeId,
          levelId,
          termId,
          classification: 'core',
          status: 'active',
        }),
        'curriculum mapping fixture',
      );

      const first = await within(
        curriculumService.reconcileCoreRegistrations(actor),
        'first reconciliation',
      );
      const second = await within(
        curriculumService.reconcileCoreRegistrations(actor),
        'second reconciliation',
      );
      assert.deepEqual(first.approvedCoreCourseIds, [String(courseId)]);
      assert.deepEqual(second.approvedCoreCourseIds, first.approvedCoreCourseIds);
      assert.equal(
        await CourseRegistrationModel.countDocuments({
          universityId,
          studentId,
          courseId,
          source: 'core',
        }),
        1,
      );
      await assert.rejects(
        () =>
          registrationService.requestBorrowed(
            actor,
            String(courseId),
            'This request should be rejected because the course is already core.',
          ),
        (error: unknown) => (error as { statusCode?: number }).statusCode === 409,
      );
    } finally {
      await within(
        Promise.all([
          CourseRegistrationModel.deleteMany({ universityId }),
          CurriculumMappingModel.deleteMany({ universityId }),
          StudentProfileModel.deleteMany({ universityId }),
          CourseModel.deleteMany({ universityId }),
          InstitutionStructureModel.deleteMany({ universityId }),
        ]),
        'fixture cleanup',
      );
      await mongoose.disconnect();
    }
  });
});
