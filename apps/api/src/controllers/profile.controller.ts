import type { RequestHandler } from 'express';
import { profileService } from '../services/profile.service.js';

function requireActor(actor: Express.Request['actor']) {
  if (!actor) throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return actor;
}

export const getMyProfile: RequestHandler = async (request, response, next) => {
  try {
    const data = await profileService.mine(requireActor(request.actor));
    response.json({
      success: true,
      message: 'Profile retrieved.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyStudentProfile: RequestHandler = async (request, response, next) => {
  try {
    const data = await profileService.updateStudent(requireActor(request.actor), request.body);
    response.json({
      success: true,
      message: 'Student profile updated.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyLecturerProfile: RequestHandler = async (request, response, next) => {
  try {
    const data = await profileService.updateLecturer(requireActor(request.actor), request.body);
    response.json({
      success: true,
      message: 'Lecturer profile updated.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getProfileOptions: RequestHandler = async (request, response, next) => {
  try {
    const data = await profileService.options(requireActor(request.actor));
    response.json({
      success: true,
      message: 'Academic profile options retrieved.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
