import type { RequestActor } from '@qr/types';
import { UserModel } from '../models/user.model.js';
import { auditService } from './audit.service.js';
import { clearanceService } from './clearance.service.js';
import { DepartmentModel } from '../models/department.model.js';

type AccountStatus = 'active' | 'locked' | 'suspended';

export class UserService {
  async updateScope(
    actor: RequestActor,
    userId: string,
    input: {
      readonly campus?: string;
      readonly facultyName?: string;
      readonly departmentId?: string;
      readonly programme?: string;
      readonly level?: string;
    },
  ) {
    const user = await UserModel.findOne({ _id: userId, universityId: actor.universityId }).exec();
    if (!user) throw Object.assign(new Error('User was not found.'), { statusCode: 404 });
    if (input.departmentId) {
      const department = await DepartmentModel.findOne({
        _id: input.departmentId,
        universityId: actor.universityId,
      })
        .select('facultyName')
        .lean()
        .exec();
      if (!department)
        throw Object.assign(new Error('The selected department was not found.'), {
          statusCode: 422,
        });
      if (input.facultyName && input.facultyName !== department.facultyName)
        throw Object.assign(new Error('The department does not belong to that faculty.'), {
          statusCode: 422,
        });
    }
    if (user.role === 'faculty_admin' && !input.facultyName)
      throw Object.assign(new Error('Faculty administrators require a faculty scope.'), {
        statusCode: 422,
      });
    if (user.role === 'department_admin' && !input.departmentId)
      throw Object.assign(new Error('Department administrators require a department scope.'), {
        statusCode: 422,
      });
    const oldValue = {
      campus: user.campus,
      facultyName: user.facultyName,
      departmentId: user.departmentId,
      programme: user.programme,
      level: user.level,
    };
    user.set({ ...input, updatedBy: actor.id });
    await user.save();
    await auditService.record({
      action: 'user.scope_updated',
      resourceType: 'user',
      resourceId: userId,
      actor,
      oldValue,
      newValue: input,
    });
    return user.toJSON();
  }

  async updateStatus(actor: RequestActor, userId: string, status: AccountStatus) {
    if (actor.id === userId)
      throw Object.assign(new Error('You cannot change your own account status.'), {
        statusCode: 409,
      });
    const user = await UserModel.findOne({
      _id: userId,
      universityId: actor.universityId,
    }).exec();
    if (!user) throw Object.assign(new Error('User was not found.'), { statusCode: 404 });
    if (user.role === 'super_admin' && actor.role !== 'super_admin')
      throw Object.assign(new Error('Only a system administrator can update this account.'), {
        statusCode: 403,
      });
    const oldValue = user.toJSON();
    user.set({ accountStatus: status, updatedBy: actor.id });
    await user.save();
    await clearanceService.expireForStudent(actor, userId);
    await auditService.record({
      action: `user.status_${status}`,
      resourceType: 'user',
      resourceId: user.id,
      actor,
      oldValue,
      newValue: user.toJSON(),
    });
    return user.toJSON();
  }
}

export const userService = new UserService();
