import { Router } from 'express';
import {
  createCourse,
  assignCourseLecturer,
  createDepartment,
  listCourses,
  listDepartments,
  listClassSchedules,
  createClassSchedule,
  updateClassSchedule,
  cancelClassSchedule,
  createCurriculumMapping,
  deactivateCurriculumMapping,
  listCurriculumMappings,
  updateCurriculumMapping,
  createLecturerAssignment,
  deactivateLecturerAssignment,
  listLecturerAssignments,
} from '../controllers/academic.controller.js';
import { authenticate, authorize, authorizeAny } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  courseLecturerSchema,
  courseSchema,
  departmentSchema,
} from '../validators/academic.validator.js';
import {
  cancelScheduleSchema,
  createScheduleSchema,
  scheduleListQuerySchema,
  updateScheduleSchema,
} from '../validators/schedule.validator.js';
import {
  createInstitutionStructure,
  deactivateInstitutionStructure,
  listInstitutionStructure,
  updateInstitutionStructure,
} from '../controllers/institution-structure.controller.js';
import {
  createInstitutionStructureSchema,
  institutionStructureIdentifierSchema,
  institutionStructureListSchema,
  updateInstitutionStructureSchema,
} from '../validators/institution-structure.validator.js';
import {
  createCurriculumMappingSchema,
  curriculumMappingIdentifierSchema,
  updateCurriculumMappingSchema,
  createLecturerAssignmentSchema,
  lecturerAssignmentIdentifierSchema,
} from '../validators/curriculum.validator.js';
export const academicRouter = Router();
academicRouter.use(authenticate);
academicRouter.get(
  '/structure',
  authorize('courses:read'),
  validate(institutionStructureListSchema),
  listInstitutionStructure,
);
academicRouter.post(
  '/structure',
  authorize('courses:write'),
  validate(createInstitutionStructureSchema),
  createInstitutionStructure,
);
academicRouter.patch(
  '/structure/:structureId',
  authorize('courses:write'),
  validate(updateInstitutionStructureSchema),
  updateInstitutionStructure,
);
academicRouter.delete(
  '/structure/:structureId',
  authorize('courses:write'),
  validate(institutionStructureIdentifierSchema),
  deactivateInstitutionStructure,
);
academicRouter.get('/departments', authorize('courses:read'), listDepartments);
academicRouter.post(
  '/departments',
  authorize('courses:write'),
  validate(departmentSchema),
  createDepartment,
);
academicRouter.get('/courses', authorize('courses:read'), listCourses);
academicRouter.post('/courses', authorize('courses:write'), validate(courseSchema), createCourse);
academicRouter.patch(
  '/courses/:courseId/lecturer',
  authorize('courses:write'),
  validate(courseLecturerSchema),
  assignCourseLecturer,
);
academicRouter.get('/curriculum', authorize('courses:read'), listCurriculumMappings);
academicRouter.post(
  '/curriculum',
  authorize('courses:write'),
  validate(createCurriculumMappingSchema),
  createCurriculumMapping,
);
academicRouter.patch(
  '/curriculum/:mappingId',
  authorize('courses:write'),
  validate(updateCurriculumMappingSchema),
  updateCurriculumMapping,
);
academicRouter.delete(
  '/curriculum/:mappingId',
  authorize('courses:write'),
  validate(curriculumMappingIdentifierSchema),
  deactivateCurriculumMapping,
);
academicRouter.get('/lecturer-assignments', authorize('courses:read'), listLecturerAssignments);
academicRouter.post(
  '/lecturer-assignments',
  authorize('courses:write'),
  validate(createLecturerAssignmentSchema),
  createLecturerAssignment,
);
academicRouter.patch(
  '/lecturer-assignments/:assignmentId/deactivate',
  authorize('courses:write'),
  validate(lecturerAssignmentIdentifierSchema),
  deactivateLecturerAssignment,
);
academicRouter.get(
  '/schedules',
  authorize('attendance:read'),
  validate(scheduleListQuerySchema),
  listClassSchedules,
);
academicRouter.post(
  '/schedules',
  authorizeAny('courses:write', 'attendance:write'),
  validate(createScheduleSchema),
  createClassSchedule,
);
academicRouter.patch(
  '/schedules/:scheduleId',
  authorizeAny('courses:write', 'attendance:write'),
  validate(updateScheduleSchema),
  updateClassSchedule,
);
academicRouter.post(
  '/schedules/:scheduleId/cancel',
  authorizeAny('courses:write', 'attendance:write'),
  validate(cancelScheduleSchema),
  cancelClassSchedule,
);
