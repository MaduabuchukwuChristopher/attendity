import { Router } from 'express';
import {
  archiveNotification,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notification.controller.js';
import {
  getReminderPreference,
  listReminderHistory,
  resetReminderPreference,
  revokePush,
  subscribePush,
  testReminderChannel,
  updateReminderPreference,
} from '../controllers/reminder.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  notificationIdentifierSchema,
  notificationListQuerySchema,
} from '../validators/notification.validator.js';
import {
  pushSubscriptionIdentifierSchema,
  pushSubscriptionSchema,
  reminderChannelSchema,
  reminderHistoryQuerySchema,
  updateReminderPreferenceSchema,
} from '../validators/reminder.validator.js';
import {
  getEventNotificationPreference,
  updateEventNotificationPreference,
} from '../controllers/event-notification.controller.js';
import { updateEventNotificationPreferenceSchema } from '../validators/event-notification.validator.js';

export const notificationRouter = Router();
notificationRouter.use(authenticate, authorize('notifications:read'));
notificationRouter.get('/events/preferences', getEventNotificationPreference);
notificationRouter.put(
  '/events/preferences',
  authorize('notifications:write'),
  validate(updateEventNotificationPreferenceSchema),
  updateEventNotificationPreference,
);
notificationRouter.get('/reminders/preferences', getReminderPreference);
notificationRouter.put(
  '/reminders/preferences',
  authorize('notifications:write'),
  validate(updateReminderPreferenceSchema),
  updateReminderPreference,
);
notificationRouter.post(
  '/reminders/preferences/reset',
  authorize('notifications:write'),
  resetReminderPreference,
);
notificationRouter.get(
  '/reminders/history',
  validate(reminderHistoryQuerySchema),
  listReminderHistory,
);
notificationRouter.post(
  '/reminders/test/:channel',
  authorize('notifications:write'),
  validate(reminderChannelSchema),
  testReminderChannel,
);
notificationRouter.post(
  '/push/subscriptions',
  authorize('notifications:write'),
  validate(pushSubscriptionSchema),
  subscribePush,
);
notificationRouter.delete(
  '/push/subscriptions',
  authorize('notifications:write'),
  validate(pushSubscriptionIdentifierSchema),
  revokePush,
);
notificationRouter.get('/', validate(notificationListQuerySchema), listNotifications);
notificationRouter.patch('/read-all', markAllNotificationsRead);
notificationRouter.patch(
  '/:notificationId/read',
  validate(notificationIdentifierSchema),
  markNotificationRead,
);
notificationRouter.patch(
  '/:notificationId/archive',
  validate(notificationIdentifierSchema),
  archiveNotification,
);
notificationRouter.delete(
  '/:notificationId',
  validate(notificationIdentifierSchema),
  deleteNotification,
);
