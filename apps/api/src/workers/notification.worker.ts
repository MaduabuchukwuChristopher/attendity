import { logger } from '../config/logger.js';
import { AttendanceSessionModel } from '../models/attendance-session.model.js';
import { CourseModel } from '../models/course.model.js';
import { ClassScheduleModel } from '../models/class-schedule.model.js';
import { ScheduledNotificationModel } from '../models/scheduled-notification.model.js';
import { AnnouncementModel } from '../models/announcement.model.js';
import { announcementService } from '../services/announcement.service.js';
import { notificationService } from '../services/notification.service.js';
import { reminderService } from '../services/reminder.service.js';
import { eventService } from '../services/event.service.js';
import { eventNotificationService } from '../services/event-notification.service.js';

const FIVE_MINUTES = 5 * 60_000;
const ONE_MINUTE = 60_000;
const MAX_DELIVERY_ATTEMPTS = 5;

function failureCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'string')
    return error.code.slice(0, 80);
  return 'delivery_failed';
}

class NotificationWorker {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), ONE_MINUTE);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.sendSessionEndingNotifications();
      await this.processClassReminders();
      await this.processAnnouncements();
      await this.processEvents();
      await this.processEventNotificationRetries();
    } catch (error) {
      logger.error({ error }, 'Notification worker failed');
    } finally {
      this.running = false;
    }
  }

  private async processEventNotificationRetries(): Promise<void> {
    const processed = await eventNotificationService.processPending();
    if (processed) logger.info({ processed }, 'Event notification delivery processing completed');
  }

  private async processEvents(): Promise<void> {
    const result = await eventService.processLifecycle();
    if (result.activated || result.completed || result.reminded)
      logger.info(result, 'Event lifecycle processing completed');
  }

  private async processAnnouncements(): Promise<void> {
    const now = new Date();
    await Promise.all([
      AnnouncementModel.updateMany(
        { status: 'published', expiresAt: { $lte: now } },
        { $set: { status: 'archived', updatedAt: now } },
      ).exec(),
      AnnouncementModel.updateMany(
        {
          status: 'scheduled',
          publicationClaimedAt: { $lte: new Date(now.getTime() - FIVE_MINUTES) },
        },
        { $unset: { publicationClaimedAt: 1 } },
      ).exec(),
    ]);
    for (let processed = 0; processed < 25; processed += 1) {
      const claimed = await AnnouncementModel.findOneAndUpdate(
        {
          status: 'scheduled',
          publishAt: { $lte: now },
          publicationClaimedAt: { $exists: false },
          publicationAttempts: { $lt: MAX_DELIVERY_ATTEMPTS },
          $or: [
            { nextPublishAttemptAt: { $exists: false } },
            { nextPublishAttemptAt: { $lte: now } },
          ],
        },
        {
          $set: { publicationClaimedAt: now },
          $inc: { publicationAttempts: 1 },
        },
        { new: true, sort: { publishAt: 1 } },
      )
        .select('+publicationAttempts universityId')
        .lean()
        .exec();
      if (!claimed) break;
      try {
        await announcementService.publishScheduled(
          String(claimed.universityId),
          String(claimed._id),
        );
      } catch (error) {
        const attempts = claimed.publicationAttempts;
        const retryMinutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
        await AnnouncementModel.updateOne(
          { _id: claimed._id, status: 'scheduled' },
          {
            $set: {
              ...(attempts < MAX_DELIVERY_ATTEMPTS
                ? { nextPublishAttemptAt: new Date(Date.now() + retryMinutes * ONE_MINUTE) }
                : {}),
            },
            $unset: { publicationClaimedAt: 1 },
          },
        ).exec();
        logger.warn(
          { error, announcementId: String(claimed._id), attempts },
          'Scheduled announcement publication failed',
        );
      }
    }
  }

  private async processClassReminders(): Promise<void> {
    const now = new Date();
    await Promise.all([
      ClassScheduleModel.updateMany(
        { status: 'scheduled', endsAt: { $lte: now } },
        { $set: { status: 'completed' } },
      ).exec(),
      ScheduledNotificationModel.updateMany(
        {
          status: 'processing',
          claimedAt: { $lte: new Date(now.getTime() - FIVE_MINUTES) },
        },
        {
          $set: {
            status: 'failed',
            failureCode: 'stale_claim_recovered',
            nextAttemptAt: now,
          },
          $unset: { claimedAt: 1 },
        },
      ).exec(),
    ]);

    for (let processed = 0; processed < 100; processed += 1) {
      const claimed = await ScheduledNotificationModel.findOneAndUpdate(
        {
          attemptCount: { $lt: MAX_DELIVERY_ATTEMPTS },
          $or: [
            { status: 'pending', scheduledFor: { $lte: now } },
            { status: 'failed', nextAttemptAt: { $lte: now } },
          ],
        },
        {
          $set: { status: 'processing', claimedAt: new Date() },
          $inc: { attemptCount: 1 },
          $unset: { nextAttemptAt: 1 },
        },
        { new: true, sort: { scheduledFor: 1 } },
      )
        .select('_id attemptCount userId')
        .lean()
        .exec();
      if (!claimed) break;
      try {
        await reminderService.deliverScheduled(String(claimed._id));
      } catch (error) {
        const attempts = claimed.attemptCount;
        const retryMinutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
        await ScheduledNotificationModel.updateOne(
          { _id: claimed._id, status: 'processing' },
          {
            $set: {
              status: 'failed',
              failureCode: failureCode(error),
              ...(attempts < MAX_DELIVERY_ATTEMPTS
                ? { nextAttemptAt: new Date(Date.now() + retryMinutes * ONE_MINUTE) }
                : {}),
              updatedBy: claimed.userId,
            },
            $unset: { claimedAt: 1 },
          },
        ).exec();
        logger.warn(
          { error, deliveryId: String(claimed._id), attempts },
          'Class reminder delivery failed',
        );
      }
    }
  }

  private async sendSessionEndingNotifications(): Promise<void> {
    const now = new Date();
    const candidates = await AttendanceSessionModel.find({
      contextType: { $ne: 'EVENT_SESSION' },
      status: 'open',
      closesAt: { $gt: now, $lte: new Date(now.getTime() + FIVE_MINUTES) },
      endingNotificationSentAt: { $exists: false },
    })
      .select('_id universityId lecturerId courseId closesAt')
      .limit(100)
      .lean()
      .exec();
    const claimed = (
      await Promise.all(
        candidates.map((candidate) =>
          AttendanceSessionModel.findOneAndUpdate(
            { _id: candidate._id, endingNotificationSentAt: { $exists: false }, status: 'open' },
            { $set: { endingNotificationSentAt: now, updatedBy: candidate.lecturerId } },
            { new: true },
          )
            .select('_id universityId lecturerId courseId closesAt')
            .lean()
            .exec(),
        ),
      )
    ).filter((session) => session !== null);
    if (!claimed.length) return;
    const courseIds = [...new Set(claimed.map((session) => String(session.courseId)))];
    const courses = await CourseModel.find({ _id: { $in: courseIds } })
      .select('code title')
      .lean()
      .exec();
    const courseMap = new Map(
      courses.map((course) => [String(course._id), `${course.code} — ${course.title}`]),
    );
    try {
      await notificationService.createMany(
        claimed.map((session) => ({
          universityId: String(session.universityId),
          recipientId: String(session.lecturerId),
          title: 'Attendance session ending soon',
          body: `${courseMap.get(String(session.courseId)) ?? 'Your attendance session'} closes at ${session.closesAt.toLocaleTimeString('en-NG')}.`,
          category: 'session_ending',
          priority: 'high' as const,
          metadata: { sessionId: String(session._id), courseId: String(session.courseId) },
        })),
      );
    } catch (error) {
      await AttendanceSessionModel.updateMany(
        { _id: { $in: claimed.map((session) => session._id) } },
        { $unset: { endingNotificationSentAt: 1 } },
      ).exec();
      throw error;
    }
  }
}

export const notificationWorker = new NotificationWorker();
