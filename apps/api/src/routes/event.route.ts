import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  archiveEvent,
  cancelEvent,
  checkInToEvent,
  closeEventAttendance,
  createEvent,
  excuseEventParticipant,
  getEvent,
  getEventAnalytics,
  getEventAttendanceRequirements,
  exportEventAnalytics,
  getStudentEventHistory,
  listEvents,
  listManagedEvents,
  listEventParticipants,
  openEventAttendance,
  publishEvent,
  recordManualEventAttendance,
  registerForEvent,
  updateEvent,
} from '../controllers/event.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  cancelEventSchema,
  createEventSchema,
  eventCheckInSchema,
  eventIdentifierSchema,
  eventAnalyticsExportSchema,
  eventAnalyticsQuerySchema,
  eventListSchema,
  eventHistoryQuerySchema,
  eventParticipantListSchema,
  eventRequirementsSchema,
  eventSessionIdentifierSchema,
  eventSessionSchema,
  excuseEventParticipantSchema,
  manualEventAttendanceSchema,
  updateEventSchema,
} from '../validators/event.validator.js';

export const eventRouter = Router();
const checkInLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many event attendance attempts. Please wait before trying again.',
    data: null,
  },
});

eventRouter.use(authenticate, authorize('events:read'));
eventRouter.get('/', validate(eventListSchema), listEvents);
eventRouter.get('/manage', authorize('events:write'), validate(eventListSchema), listManagedEvents);
eventRouter.get('/history', validate(eventHistoryQuerySchema), getStudentEventHistory);
eventRouter.post('/', authorize('events:write'), validate(createEventSchema), createEvent);
eventRouter.get('/:eventId', validate(eventIdentifierSchema), getEvent);
eventRouter.get(
  '/:eventId/participants',
  authorize('events:write'),
  validate(eventParticipantListSchema),
  listEventParticipants,
);
eventRouter.patch('/:eventId', authorize('events:write'), validate(updateEventSchema), updateEvent);
eventRouter.post(
  '/:eventId/publish',
  authorize('events:write'),
  validate(eventIdentifierSchema),
  publishEvent,
);
eventRouter.post('/:eventId/register', validate(eventIdentifierSchema), registerForEvent);
eventRouter.post(
  '/:eventId/cancel',
  authorize('events:write'),
  validate(cancelEventSchema),
  cancelEvent,
);
eventRouter.post(
  '/:eventId/archive',
  authorize('events:write'),
  validate(eventIdentifierSchema),
  archiveEvent,
);
eventRouter.post(
  '/:eventId/attendance/open',
  authorize('events:write'),
  validate(eventSessionSchema),
  openEventAttendance,
);
eventRouter.patch(
  '/:eventId/attendance/:sessionId/close',
  authorize('events:write'),
  validate(eventSessionIdentifierSchema),
  closeEventAttendance,
);
eventRouter.post(
  '/:eventId/attendance/requirements',
  checkInLimiter,
  validate(eventRequirementsSchema),
  getEventAttendanceRequirements,
);
eventRouter.post(
  '/:eventId/attendance/check-in',
  checkInLimiter,
  validate(eventCheckInSchema),
  checkInToEvent,
);
eventRouter.post(
  '/:eventId/attendance/manual',
  authorize('events:write'),
  validate(manualEventAttendanceSchema),
  recordManualEventAttendance,
);
eventRouter.post(
  '/:eventId/participants/:userId/excuse',
  authorize('events:write'),
  validate(excuseEventParticipantSchema),
  excuseEventParticipant,
);
eventRouter.get(
  '/:eventId/analytics',
  authorize('events:write'),
  validate(eventAnalyticsQuerySchema),
  getEventAnalytics,
);
eventRouter.get(
  '/:eventId/analytics/export/:format',
  authorize('events:write'),
  validate(eventAnalyticsExportSchema),
  exportEventAnalytics,
);
