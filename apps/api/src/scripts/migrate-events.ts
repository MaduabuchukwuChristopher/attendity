import { connectDatabase, disconnectDatabase } from '../database/mongodb.js';
import { logger } from '../config/logger.js';
import { AttendanceRecordModel } from '../models/attendance-record.model.js';
import { AttendanceSessionModel } from '../models/attendance-session.model.js';
import { EventModel } from '../models/event.model.js';
import { EventRegistrationModel } from '../models/event-registration.model.js';
import { EventVerificationAttemptModel } from '../models/event-verification-attempt.model.js';
import { EventNotificationPreferenceModel } from '../models/event-notification-preference.model.js';
import { EventNotificationDeliveryModel } from '../models/event-notification-delivery.model.js';
import { EventReportSnapshotModel } from '../models/event-report-snapshot.model.js';
import { MediaAssetModel } from '../models/media-asset.model.js';

if (process.env.ALLOW_EVENT_MIGRATION !== 'true')
  throw new Error(
    'Set ALLOW_EVENT_MIGRATION=true to apply the event attendance compatibility migration.',
  );

async function migrate(): Promise<void> {
  await connectDatabase();
  const [sessions, records] = await Promise.all([
    AttendanceSessionModel.collection.updateMany({ contextType: { $exists: false } }, [
      {
        $set: {
          contextType: 'CLASS_SESSION',
          ownerId: '$lecturerId',
          dynamicQrEnabled: true,
          manualAttendanceAllowed: false,
          pinAttendanceAllowed: false,
        },
      },
    ]),
    AttendanceRecordModel.collection.updateMany(
      { contextType: { $exists: false } },
      {
        $set: {
          contextType: 'CLASS_SESSION',
          verificationMethods: ['dynamic_qr'],
          pinVerified: false,
        },
      },
    ),
  ]);
  await Promise.all([
    AttendanceSessionModel.createIndexes(),
    AttendanceRecordModel.createIndexes(),
    EventModel.createIndexes(),
    EventRegistrationModel.createIndexes(),
    EventVerificationAttemptModel.createIndexes(),
    EventNotificationPreferenceModel.createIndexes(),
    EventNotificationDeliveryModel.createIndexes(),
    EventReportSnapshotModel.createIndexes(),
    MediaAssetModel.createIndexes(),
  ]);
  logger.info(
    { migratedSessions: sessions.modifiedCount, migratedRecords: records.modifiedCount },
    'Event attendance compatibility migration completed',
  );
}

void migrate()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Event attendance compatibility migration failed');
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
