import { connectDatabase, disconnectDatabase } from '../database/mongodb.js';
import { logger } from '../config/logger.js';
import { AnnouncementModel } from '../models/announcement.model.js';
import { AnnouncementReceiptModel } from '../models/announcement-receipt.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { UserModel } from '../models/user.model.js';
import { MediaAssetModel } from '../models/media-asset.model.js';

if (process.env.ALLOW_ANNOUNCEMENT_MIGRATION !== 'true')
  throw new Error('Set ALLOW_ANNOUNCEMENT_MIGRATION=true to create announcement indexes.');

async function migrate(): Promise<void> {
  await connectDatabase();
  await Promise.all([
    AnnouncementModel.updateMany({}, [
      {
        $set: {
          priorityRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'low'] }, then: 1 },
                { case: { $eq: ['$priority', 'high'] }, then: 3 },
                { case: { $eq: ['$priority', 'urgent'] }, then: 4 },
              ],
              default: 2,
            },
          },
        },
      },
    ]),
    AnnouncementModel.createIndexes(),
    AnnouncementReceiptModel.createIndexes(),
    NotificationModel.createIndexes(),
    UserModel.collection.createIndex({ universityId: 1, facultyName: 1 }),
    UserModel.collection.createIndex({ universityId: 1, departmentId: 1 }),
    UserModel.collection.createIndex({ universityId: 1, campus: 1 }),
    MediaAssetModel.createIndexes(),
  ]);
  logger.info('Announcement compatibility migration completed');
}

void migrate()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Announcement compatibility migration failed');
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
