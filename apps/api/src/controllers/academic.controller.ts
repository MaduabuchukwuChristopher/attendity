import type { RequestHandler } from 'express';
import { academicService } from '../services/academic.service.js';
import { scheduleService } from '../services/schedule.service.js';
import { scheduleListQuerySchema } from '../validators/schedule.validator.js';
import { curriculumService } from '../services/curriculum.service.js';
import { lecturerAssignmentService } from '../services/lecturer-assignment.service.js';
function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}
export const listDepartments: RequestHandler = async (request, response, next) => {
  try {
    const current = actor(request);
    response.json({
      success: true,
      message: 'Departments retrieved.',
      data: await academicService.listDepartments(current.universityId),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const createDepartment: RequestHandler = async (request, response, next) => {
  try {
    const data = await academicService.createDepartment(actor(request), request.body);
    response.status(201).json({
      success: true,
      message: 'Department created.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const listCourses: RequestHandler = async (request, response, next) => {
  try {
    const current = actor(request);
    response.json({
      success: true,
      message: 'Courses retrieved.',
      data: await academicService.listCourses(current.universityId),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const createCourse: RequestHandler = async (request, response, next) => {
  try {
    const data = await academicService.createCourse(actor(request), request.body);
    response.status(201).json({
      success: true,
      message: 'Course created.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const assignCourseLecturer: RequestHandler = async (request, response, next) => {
  try {
    const courseId = request.params.courseId;
    if (typeof courseId !== 'string')
      throw Object.assign(new Error('Course was not found.'), { statusCode: 404 });
    response.json({
      success: true,
      message: 'Lecturer assigned to course.',
      data: await academicService.assignLecturer(actor(request), courseId, request.body.lecturerId),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

function scheduleId(request: Parameters<RequestHandler>[0]): string {
  const value = request.params.scheduleId;
  if (typeof value !== 'string')
    throw Object.assign(new Error('Class schedule was not found.'), { statusCode: 404 });
  return value;
}

export const listClassSchedules: RequestHandler = async (request, response, next) => {
  try {
    const query = scheduleListQuerySchema.parse({ query: request.query }).query;
    response.json({
      success: true,
      message: 'Class schedules retrieved.',
      data: await scheduleService.list(actor(request), query),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const createClassSchedule: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Class schedule created.',
      data: await scheduleService.create(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateClassSchedule: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Class schedule updated.',
      data: await scheduleService.update(actor(request), scheduleId(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const cancelClassSchedule: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Class schedule cancelled.',
      data: await scheduleService.cancel(actor(request), scheduleId(request), request.body.reason),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

function curriculumMappingId(request: Parameters<RequestHandler>[0]): string {
  const value = request.params.mappingId;
  if (typeof value !== 'string')
    throw Object.assign(new Error('Curriculum mapping was not found.'), { statusCode: 404 });
  return value;
}

export const listCurriculumMappings: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Curriculum mappings retrieved.',
      data: await curriculumService.list(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const createCurriculumMapping: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Curriculum mapping created.',
      data: await curriculumService.create(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateCurriculumMapping: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Curriculum mapping updated.',
      data: await curriculumService.update(
        actor(request),
        curriculumMappingId(request),
        request.body,
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateCurriculumMapping: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Curriculum mapping deactivated.',
      data: await curriculumService.deactivate(actor(request), curriculumMappingId(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

function lecturerAssignmentId(request: Parameters<RequestHandler>[0]): string {
  const value = request.params.assignmentId;
  if (typeof value !== 'string')
    throw Object.assign(new Error('Lecturer assignment was not found.'), { statusCode: 404 });
  return value;
}

export const listLecturerAssignments: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Lecturer assignments retrieved.',
      data: await lecturerAssignmentService.list(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const createLecturerAssignment: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Lecturer assignment created.',
      data: await lecturerAssignmentService.assign(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateLecturerAssignment: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Lecturer assignment deactivated.',
      data: await lecturerAssignmentService.deactivate(
        actor(request),
        lecturerAssignmentId(request),
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
