import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';
import type { RequestActor } from '@qr/types';
import { CourseModel } from '../src/models/course.model.js';
import { LecturerAssignmentModel } from '../src/models/lecturer-assignment.model.js';
import { lecturerAssignmentService } from '../src/services/lecturer-assignment.service.js';
import {
  createLecturerAssignmentSchema,
  lecturerAssignmentIdentifierSchema,
} from '../src/validators/curriculum.validator.js';

const objectId = () => new mongoose.Types.ObjectId();

void describe('academic-period lecturer assignments', () => {
  void it('validates scoped assignments and rejects reversed dates', () => {
    const body = {
      lecturerId: String(objectId()),
      courseId: String(objectId()),
      academicSessionId: String(objectId()),
      termId: String(objectId()),
      assignmentRole: 'primary',
      startsAt: '2026-01-10T08:00:00.000Z',
      endsAt: '2026-05-10T08:00:00.000Z',
    };
    assert.equal(createLecturerAssignmentSchema.safeParse({ body }).success, true);
    assert.equal(
      createLecturerAssignmentSchema.safeParse({
        body: { ...body, startsAt: body.endsAt, endsAt: body.startsAt },
      }).success,
      false,
    );
    assert.equal(
      lecturerAssignmentIdentifierSchema.safeParse({
        params: { assignmentId: body.courseId },
      }).success,
      true,
    );
  });

  void it('prefers active period assignments and uses legacy ownership only when unclaimed', async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
    const universityId = objectId();
    const lecturerId = objectId();
    const otherLecturerId = objectId();
    const assignedCourseId = objectId();
    const legacyCourseId = objectId();
    const claimedLegacyCourseId = objectId();
    const termId = objectId();
    const referenceDate = new Date('2026-03-01T12:00:00.000Z');
    const actor: RequestActor = {
      id: String(lecturerId),
      universityId: String(universityId),
      email: 'lecturer@example.edu',
      fullName: 'Test Lecturer',
      role: 'lecturer',
      sessionId: 'assignment-test',
      permissions: ['attendance:write'],
    };
    const course = (id: mongoose.Types.ObjectId, code: string) => ({
      _id: id,
      universityId,
      code,
      title: `${code} Course`,
      creditUnits: 3,
      departmentId: objectId(),
      lecturerId,
      attendanceRequirement: 75,
      status: 'active',
    });
    try {
      await CourseModel.create([
        course(assignedCourseId, `A${assignedCourseId.toHexString().slice(-5)}`),
        course(legacyCourseId, `L${legacyCourseId.toHexString().slice(-5)}`),
        course(claimedLegacyCourseId, `C${claimedLegacyCourseId.toHexString().slice(-5)}`),
      ]);
      await LecturerAssignmentModel.create([
        {
          universityId,
          lecturerId,
          courseId: assignedCourseId,
          academicSessionId: objectId(),
          termId,
          assignmentRole: 'primary',
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          endsAt: new Date('2026-06-30T23:59:59.000Z'),
          status: 'active',
        },
        {
          universityId,
          lecturerId: otherLecturerId,
          courseId: claimedLegacyCourseId,
          academicSessionId: objectId(),
          termId,
          assignmentRole: 'primary',
          startsAt: new Date('2026-01-01T00:00:00.000Z'),
          endsAt: new Date('2026-06-30T23:59:59.000Z'),
          status: 'active',
        },
      ]);

      const courseIds = await lecturerAssignmentService.activeCourseIds(actor, referenceDate);
      assert.deepEqual(
        [...courseIds].sort(),
        [String(assignedCourseId), String(legacyCourseId)].sort(),
      );
      assert.equal(courseIds.includes(String(claimedLegacyCourseId)), false);
    } finally {
      await Promise.all([
        LecturerAssignmentModel.deleteMany({ universityId }),
        CourseModel.deleteMany({ universityId }),
      ]);
      await mongoose.disconnect();
    }
  });
});
