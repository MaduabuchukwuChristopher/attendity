import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  checkInToAttendance,
  closeAttendanceSession,
  createAttendanceSession,
  downloadStaticAttendanceQr,
  enrolFaceProfile,
  getAttendanceRequirements,
  getLecturerWorkspace,
  getStudentWorkspace,
  verifyClearance,
} from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  attendanceCheckInSchema,
  attendanceRequirementsSchema,
  clearanceLookupSchema,
  closeAttendanceSessionSchema,
  createAttendanceSessionSchema,
  faceEnrolmentSchema,
} from '../validators/attendance.validator.js';

export const attendanceRouter = Router();
const checkInLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attendance attempts. Please wait before trying again.',
    data: null,
  },
});
const biometricLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many face enrolment attempts. Please try again later.',
    data: null,
  },
});
attendanceRouter.use(authenticate);
attendanceRouter.get('/lecturer', authorize('attendance:write'), getLecturerWorkspace);
attendanceRouter.post(
  '/sessions',
  authorize('attendance:write'),
  validate(createAttendanceSessionSchema),
  createAttendanceSession,
);
attendanceRouter.patch(
  '/sessions/:sessionId/close',
  authorize('attendance:write'),
  validate(closeAttendanceSessionSchema),
  closeAttendanceSession,
);
attendanceRouter.get(
  '/sessions/:sessionId/qr.pdf',
  authorize('attendance:write'),
  validate(closeAttendanceSessionSchema),
  downloadStaticAttendanceQr,
);
attendanceRouter.get('/student', authorize('attendance:read'), getStudentWorkspace);
attendanceRouter.post(
  '/check-in/requirements',
  checkInLimiter,
  authorize('attendance:read'),
  validate(attendanceRequirementsSchema),
  getAttendanceRequirements,
);
attendanceRouter.post(
  '/check-in',
  checkInLimiter,
  authorize('attendance:read'),
  validate(attendanceCheckInSchema),
  checkInToAttendance,
);
attendanceRouter.post(
  '/face-profile',
  biometricLimiter,
  authorize('attendance:read'),
  validate(faceEnrolmentSchema),
  enrolFaceProfile,
);
attendanceRouter.get(
  '/clearance/:registrationNumber',
  authorize('clearance:verify'),
  validate(clearanceLookupSchema),
  verifyClearance,
);
