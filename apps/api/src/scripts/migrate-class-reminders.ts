import { connectDatabase, disconnectDatabase } from '../database/mongodb.js';
import { logger } from '../config/logger.js';
import { ClassScheduleModel } from '../models/class-schedule.model.js';
import { PushSubscriptionModel } from '../models/push-subscription.model.js';
import { ReminderPreferenceModel } from '../models/reminder-preference.model.js';
import { ScheduledNotificationModel } from '../models/scheduled-notification.model.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';

if (process.env.ALLOW_CLASS_REMINDER_MIGRATION !== 'true')
  throw new Error(
    'Set ALLOW_CLASS_REMINDER_MIGRATION=true to apply class reminder defaults and indexes.',
  );

async function migrate(): Promise<void> {
  await connectDatabase();
  const settings = await SystemSettingsModel.updateMany({ deletedAt: { $exists: false } }, [
    {
      $set: {
        reminderAllowedChannels: {
          $ifNull: [
            '$reminderAllowedChannels',
            { inApp: true, email: true, push: true, sms: false },
          ],
        },
        maximumReminderWindowMinutes: { $ifNull: ['$maximumReminderWindowMinutes', 1440] },
      },
    },
  ]).exec();
  await Promise.all([
    ClassScheduleModel.createIndexes(),
    ReminderPreferenceModel.createIndexes(),
    ScheduledNotificationModel.createIndexes(),
    PushSubscriptionModel.createIndexes(),
  ]);
  logger.info(
    { settingsMatched: settings.matchedCount, settingsUpdated: settings.modifiedCount },
    'Class reminder compatibility migration completed',
  );
}

void migrate()
  .catch((error: unknown) => {
    logger.error({ error }, 'Class reminder compatibility migration failed');
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
