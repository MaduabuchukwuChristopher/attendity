import { Router } from 'express';
import {
  createRegistration,
  listMyRegistrations,
  listRegistrations,
  updateRegistrationStatus,
  listRegistrationRecommendations,
  reconcileMyRegistrations,
  requestBorrowedCourse,
  resubmitBorrowedCourse,
  reviewBorrowedCourse,
  updateBorrowedCourse,
  withdrawBorrowedCourse,
  selectElectiveCourse,
  withdrawElectiveCourse,
} from '../controllers/registration.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createRegistrationSchema,
  updateRegistrationSchema,
  borrowedCourseIdentifierSchema,
  borrowedCourseRequestSchema,
  borrowedCourseResubmitSchema,
  borrowedCourseReviewSchema,
  borrowedCourseUpdateSchema,
  electiveCourseSelectionSchema,
  electiveRegistrationIdentifierSchema,
} from '../validators/registration.validator.js';

export const registrationRouter = Router();

registrationRouter.use(authenticate);
registrationRouter.get('/mine', listMyRegistrations);
registrationRouter.get('/recommendations', listRegistrationRecommendations);
registrationRouter.post('/reconcile', reconcileMyRegistrations);
registrationRouter.post(
  '/electives',
  validate(electiveCourseSelectionSchema),
  selectElectiveCourse,
);
registrationRouter.delete(
  '/electives/:registrationId',
  validate(electiveRegistrationIdentifierSchema),
  withdrawElectiveCourse,
);
registrationRouter.post('/borrowed', validate(borrowedCourseRequestSchema), requestBorrowedCourse);
registrationRouter.patch(
  '/borrowed/:registrationId',
  validate(borrowedCourseUpdateSchema),
  updateBorrowedCourse,
);
registrationRouter.post(
  '/borrowed/:registrationId/withdraw',
  validate(borrowedCourseIdentifierSchema),
  withdrawBorrowedCourse,
);
registrationRouter.post(
  '/borrowed/:registrationId/resubmit',
  validate(borrowedCourseResubmitSchema),
  resubmitBorrowedCourse,
);
registrationRouter.post(
  '/borrowed/:registrationId/review',
  authorize('courses:write'),
  validate(borrowedCourseReviewSchema),
  reviewBorrowedCourse,
);
registrationRouter.get('/', authorize('courses:read', 'users:read'), listRegistrations);
registrationRouter.post(
  '/',
  authorize('courses:write'),
  validate(createRegistrationSchema),
  createRegistration,
);
registrationRouter.patch(
  '/:registrationId',
  authorize('courses:write'),
  validate(updateRegistrationSchema),
  updateRegistrationStatus,
);
