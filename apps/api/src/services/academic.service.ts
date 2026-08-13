import { CourseModel } from '../models/course.model.js';
import { DepartmentModel } from '../models/department.model.js';
import { UserModel } from '../models/user.model.js';
import { auditService } from './audit.service.js';
import type { RequestActor } from '@qr/types';
export class AcademicService {
  async listDepartments(universityId: string): Promise<readonly Record<string, unknown>[]> {
    return DepartmentModel.find({ universityId }).sort({ name: 1 }).lean().exec();
  }
  async createDepartment(
    actor: RequestActor,
    values: { code: string; name: string; facultyName: string },
  ) {
    const department = await DepartmentModel.create({
      ...values,
      universityId: actor.universityId,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.record({
      action: 'department.created',
      resourceType: 'department',
      resourceId: department.id,
      actor,
      newValue: department.toJSON(),
    });
    return department.toJSON();
  }
  async listCourses(universityId: string): Promise<readonly Record<string, unknown>[]> {
    return CourseModel.find({ universityId })
      .populate('departmentId', 'name code')
      .populate('lecturerId', 'firstName lastName email')
      .sort({ code: 1 })
      .lean()
      .exec();
  }
  async createCourse(
    actor: RequestActor,
    values: {
      code: string;
      title: string;
      creditUnits: number;
      departmentId: string;
      attendanceRequirement: number;
      lecturerId?: string;
    },
  ) {
    const [department, lecturer] = await Promise.all([
      DepartmentModel.exists({
        _id: values.departmentId,
        universityId: actor.universityId,
      }),
      values.lecturerId
        ? UserModel.exists({
            _id: values.lecturerId,
            universityId: actor.universityId,
            role: 'lecturer',
            accountStatus: 'active',
          })
        : Promise.resolve(true),
    ]);
    if (!department)
      throw Object.assign(new Error('Department was not found in this institution.'), {
        statusCode: 422,
      });
    if (!lecturer)
      throw Object.assign(new Error('Active educator was not found in this institution.'), {
        statusCode: 422,
      });
    const course = await CourseModel.create({
      ...values,
      universityId: actor.universityId,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.record({
      action: 'course.created',
      resourceType: 'course',
      resourceId: course.id,
      actor,
      newValue: course.toJSON(),
    });
    return course.toJSON();
  }

  async assignLecturer(actor: RequestActor, courseId: string, lecturerId: string) {
    const lecturer = await UserModel.exists({
      _id: lecturerId,
      universityId: actor.universityId,
      role: 'lecturer',
      accountStatus: 'active',
    });
    if (!lecturer)
      throw Object.assign(new Error('Active educator was not found in this institution.'), {
        statusCode: 422,
      });
    const course = await CourseModel.findOne({
      _id: courseId,
      universityId: actor.universityId,
    }).exec();
    if (!course)
      throw Object.assign(new Error('Course was not found in this institution.'), {
        statusCode: 404,
      });
    course.set({ lecturerId, updatedBy: actor.id });
    await course.save();
    await auditService.record({
      action: 'course.lecturer_assigned',
      resourceType: 'course',
      resourceId: course.id,
      actor,
      newValue: course.toJSON(),
    });
    await course.populate('lecturerId', 'firstName lastName email');
    return course.toJSON();
  }
}
export const academicService = new AcademicService();
