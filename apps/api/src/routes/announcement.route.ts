import { Router } from 'express';
import {
  acknowledgeAnnouncement,
  announcementDelivery,
  archiveAnnouncement,
  cancelAnnouncement,
  createAnnouncement,
  getAnnouncement,
  listAnnouncements,
  listManagedAnnouncements,
  pinAnnouncement,
  publishAnnouncement,
  readAnnouncement,
  scheduleAnnouncement,
  updateAnnouncement,
} from '../controllers/announcement.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  announcementIdentifierSchema,
  announcementListQuerySchema,
  announcementManagementQuerySchema,
  cancelAnnouncementSchema,
  createAnnouncementSchema,
  pinAnnouncementSchema,
  scheduleAnnouncementSchema,
  updateAnnouncementSchema,
} from '../validators/announcement.validator.js';

export const announcementRouter = Router();
announcementRouter.use(authenticate, authorize('announcements:read'));
announcementRouter.get('/', validate(announcementListQuerySchema), listAnnouncements);
announcementRouter.get(
  '/manage',
  authorize('announcements:write'),
  validate(announcementManagementQuerySchema),
  listManagedAnnouncements,
);
announcementRouter.post(
  '/',
  authorize('announcements:write'),
  validate(createAnnouncementSchema),
  createAnnouncement,
);
announcementRouter.get('/:announcementId', validate(announcementIdentifierSchema), getAnnouncement);
announcementRouter.patch(
  '/:announcementId',
  authorize('announcements:write'),
  validate(updateAnnouncementSchema),
  updateAnnouncement,
);
announcementRouter.post(
  '/:announcementId/schedule',
  authorize('announcements:write'),
  validate(scheduleAnnouncementSchema),
  scheduleAnnouncement,
);
announcementRouter.post(
  '/:announcementId/publish',
  authorize('announcements:write'),
  validate(announcementIdentifierSchema),
  publishAnnouncement,
);
announcementRouter.post(
  '/:announcementId/archive',
  authorize('announcements:write'),
  validate(announcementIdentifierSchema),
  archiveAnnouncement,
);
announcementRouter.post(
  '/:announcementId/cancel',
  authorize('announcements:write'),
  validate(cancelAnnouncementSchema),
  cancelAnnouncement,
);
announcementRouter.patch(
  '/:announcementId/pin',
  authorize('announcements:write'),
  validate(pinAnnouncementSchema),
  pinAnnouncement,
);
announcementRouter.get(
  '/:announcementId/delivery',
  authorize('announcements:write'),
  validate(announcementIdentifierSchema),
  announcementDelivery,
);
announcementRouter.post(
  '/:announcementId/read',
  validate(announcementIdentifierSchema),
  readAnnouncement,
);
announcementRouter.post(
  '/:announcementId/acknowledge',
  validate(announcementIdentifierSchema),
  acknowledgeAnnouncement,
);
