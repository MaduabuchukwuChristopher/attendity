import type { RequestHandler } from 'express';
import { UserModel } from '../models/user.model.js';
import { userService } from '../services/user.service.js';
import { invitationService } from '../services/invitation.service.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

export const createStaffInvitation: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Staff invitation sent.',
      data: await invitationService.create(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const listStaffInvitations: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Staff invitations retrieved.',
      data: await invitationService.list(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const revokeStaffInvitation: RequestHandler = async (request, response, next) => {
  try {
    const invitationId = request.params.invitationId;
    if (typeof invitationId !== 'string')
      throw Object.assign(new Error('Invitation was not found.'), { statusCode: 404 });
    await invitationService.revoke(actor(request), invitationId);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};
export const listUsers: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    const users = await UserModel.find({ universityId: request.actor.universityId })
      .select(
        'firstName lastName email role accountStatus lastLogin campus facultyName departmentId programme level',
      )
      .sort({ lastName: 1, firstName: 1 })
      .lean()
      .exec();
    response.json({
      success: true,
      message: 'Users retrieved.',
      data: users,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const updateUserScope: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    const userId = request.params.userId;
    if (typeof userId !== 'string')
      throw Object.assign(new Error('User was not found.'), { statusCode: 404 });
    response.json({
      success: true,
      message: 'User communication scope updated.',
      data: await userService.updateScope(request.actor, userId, request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const updateUserStatus: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    const userId = request.params.userId;
    if (typeof userId !== 'string')
      throw Object.assign(new Error('User was not found.'), { statusCode: 404 });
    response.json({
      success: true,
      message: 'User account status updated.',
      data: await userService.updateStatus(request.actor, userId, request.body.status),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
