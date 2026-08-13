import { Router } from 'express';
import {
  getMyProfile,
  updateMyLecturerProfile,
  updateMyStudentProfile,
  getProfileOptions,
} from '../controllers/profile.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  updateLecturerProfileSchema,
  updateStudentProfileSchema,
} from '../validators/profile.validator.js';

export const profileRouter = Router();

profileRouter.get('/me', authenticate, getMyProfile);
profileRouter.get('/options', authenticate, getProfileOptions);
profileRouter.patch(
  '/student',
  authenticate,
  validate(updateStudentProfileSchema),
  updateMyStudentProfile,
);
profileRouter.patch(
  '/lecturer',
  authenticate,
  validate(updateLecturerProfileSchema),
  updateMyLecturerProfile,
);
