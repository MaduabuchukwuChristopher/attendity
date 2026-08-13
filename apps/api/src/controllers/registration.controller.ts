import type { RequestHandler } from 'express';
import { registrationService } from '../services/registration.service.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

export const listRegistrations: RequestHandler = async (request, response, next) => {
  try {
    const current = actor(request);
    response.json({
      success: true,
      message: 'Course registrations retrieved.',
      data: await registrationService.list(current.universityId),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const listMyRegistrations: RequestHandler = async (request, response, next) => {
  try {
    const current = actor(request);
    response.json({
      success: true,
      message: 'Course registrations retrieved.',
      data: await registrationService.listMine(current.universityId, current.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const createRegistration: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Course registration created.',
      data: await registrationService.create(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateRegistrationStatus: RequestHandler = async (request, response, next) => {
  try {
    const registrationId = request.params.registrationId;
    if (typeof registrationId !== 'string')
      throw Object.assign(new Error('Course registration was not found.'), { statusCode: 404 });
    response.json({
      success: true,
      message: 'Course registration updated.',
      data: await registrationService.updateStatus(
        actor(request),
        registrationId,
        request.body.status,
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

function registrationId(request: Parameters<RequestHandler>[0]): string {
  const value = request.params.registrationId;
  if (typeof value !== 'string')
    throw Object.assign(new Error('Course registration was not found.'), { statusCode: 404 });
  return value;
}

export const listRegistrationRecommendations: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Course recommendations retrieved.',
      data: await registrationService.recommendations(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const reconcileMyRegistrations: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Core course registrations reconciled.',
      data: await registrationService.reconcile(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const requestBorrowedCourse: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Borrowed-course request submitted.',
      data: await registrationService.requestBorrowed(
        actor(request),
        request.body.courseId,
        request.body.reason,
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateBorrowedCourse: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Borrowed-course request updated.',
      data: await registrationService.updateBorrowed(
        actor(request),
        registrationId(request),
        request.body.reason,
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawBorrowedCourse: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Borrowed-course request withdrawn.',
      data: await registrationService.withdrawBorrowed(actor(request), registrationId(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const resubmitBorrowedCourse: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Borrowed-course request resubmitted.',
      data: await registrationService.resubmitBorrowed(
        actor(request),
        registrationId(request),
        request.body.reason,
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const reviewBorrowedCourse: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: `Borrowed-course request ${request.body.decision}d.`,
      data: await registrationService.reviewBorrowed(
        actor(request),
        registrationId(request),
        request.body.decision,
        request.body.note,
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const selectElectiveCourse: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Elective course selected.',
      data: await registrationService.selectElective(actor(request), request.body.courseId),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawElectiveCourse: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Elective course withdrawn.',
      data: await registrationService.withdrawElective(actor(request), registrationId(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
