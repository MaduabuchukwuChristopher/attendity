import type {
  NotificationChannel,
  ReminderChannelAvailability,
  ReminderHistoryPage,
  ReminderPreference,
  RequestActor,
} from '@qr/types';
import { ClassScheduleModel } from '../models/class-schedule.model.js';
import { CourseRegistrationModel } from '../models/course-registration.model.js';
import { CourseModel } from '../models/course.model.js';
import { ReminderPreferenceModel } from '../models/reminder-preference.model.js';
import { ScheduledNotificationModel } from '../models/scheduled-notification.model.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';
import { UserModel } from '../models/user.model.js';
import { socketService } from '../socket/socket.service.js';
import type { UpdateReminderPreferenceInput } from '../validators/reminder.validator.js';
import { auditService } from './audit.service.js';
import { emailService } from './email.service.js';
import { notificationService } from './notification.service.js';
import { pushDeliveryService } from './push-delivery.service.js';

const CHANNELS: readonly NotificationChannel[] = ['in_app', 'email', 'push', 'sms'];

interface ReminderPolicy {
  readonly allowed: Readonly<Record<NotificationChannel, boolean>>;
  readonly maximumWindowMinutes: number;
}

function id(value: unknown): string {
  return String(value);
}

function minutesInTimeZone(value: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function quietAdjustedTime(
  candidate: Date,
  classStartsAt: Date,
  timeZone: string,
  quietHours: {
    readonly enabled: boolean;
    readonly startMinute: number;
    readonly endMinute: number;
  },
): Date | undefined {
  if (!quietHours.enabled) return candidate;
  const localMinute = minutesInTimeZone(candidate, timeZone);
  const inside =
    quietHours.startMinute < quietHours.endMinute
      ? localMinute >= quietHours.startMinute && localMinute < quietHours.endMinute
      : localMinute >= quietHours.startMinute || localMinute < quietHours.endMinute;
  if (!inside) return candidate;
  const minutesUntilEnd = (quietHours.endMinute - localMinute + 1440) % 1440;
  const adjusted = new Date(candidate.getTime() + minutesUntilEnd * 60_000);
  return adjusted < classStartsAt ? adjusted : undefined;
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

export class ReminderService {
  private async policy(universityId: string): Promise<ReminderPolicy> {
    const settings = await SystemSettingsModel.findOne({ universityId })
      .select('reminderAllowedChannels maximumReminderWindowMinutes')
      .lean()
      .exec();
    return {
      allowed: {
        in_app: settings?.reminderAllowedChannels?.inApp ?? true,
        email: settings?.reminderAllowedChannels?.email ?? true,
        push: settings?.reminderAllowedChannels?.push ?? true,
        sms: settings?.reminderAllowedChannels?.sms ?? false,
      },
      maximumWindowMinutes: settings?.maximumReminderWindowMinutes ?? 1440,
    };
  }

  private async courseOptions(actor: RequestActor) {
    const courseIds =
      actor.role === 'student'
        ? (
            await CourseRegistrationModel.find({
              universityId: actor.universityId,
              studentId: actor.id,
              status: 'approved',
            })
              .select('courseId')
              .lean()
              .exec()
          ).map((registration) => registration.courseId)
        : undefined;
    const courses = await CourseModel.find({
      universityId: actor.universityId,
      status: 'active',
      ...(actor.role === 'lecturer' ? { lecturerId: actor.id } : {}),
      ...(courseIds ? { _id: { $in: courseIds } } : {}),
    })
      .select('code title')
      .sort({ code: 1 })
      .lean()
      .exec();
    return courses.map((course) => ({
      id: id(course._id),
      code: course.code,
      title: course.title,
    }));
  }

  private async availability(
    universityId: string,
    userId: string,
    policy: ReminderPolicy,
  ): Promise<readonly ReminderChannelAvailability[]> {
    const pushSubscribed = await pushDeliveryService.isSubscribed(universityId, userId);
    const emailConfigured = emailService.isConfigured();
    const pushConfigured = pushDeliveryService.isConfigured();
    return CHANNELS.map((channel) => {
      const allowed = policy.allowed[channel];
      const configured =
        channel === 'in_app'
          ? true
          : channel === 'email'
            ? emailConfigured
            : channel === 'push'
              ? pushConfigured
              : false;
      const subscribed = channel !== 'push' || pushSubscribed;
      const available = allowed && configured && subscribed;
      const reason = !allowed
        ? 'Disabled by institution policy.'
        : !configured
          ? channel === 'sms'
            ? 'SMS provider not configured.'
            : `${channel === 'email' ? 'Email' : 'Push'} provider not configured.`
          : !subscribed
            ? 'Enable push notifications on this device first.'
            : undefined;
      return { channel, allowed, configured, available, ...(reason ? { reason } : {}) };
    });
  }

  async getPreference(actor: RequestActor): Promise<ReminderPreference> {
    const [record, policy, courses, pushSubscribed] = await Promise.all([
      ReminderPreferenceModel.findOne({ universityId: actor.universityId, userId: actor.id })
        .lean()
        .exec(),
      this.policy(actor.universityId),
      this.courseOptions(actor),
      pushDeliveryService.isSubscribed(actor.universityId, actor.id),
    ]);
    const muted = new Set((record?.mutedCourseIds ?? []).map(id));
    const channelAvailability = await this.availability(actor.universityId, actor.id, policy);
    const pushPublicKey = pushDeliveryService.publicKey();
    const recordUpdatedAt = (record as { updatedAt?: Date } | null)?.updatedAt;
    return {
      enabled: record?.enabled ?? true,
      defaultOffsetMinutes: record?.defaultOffsetMinutes ?? 30,
      channels: record?.channels ?? ['in_app'],
      ...(record?.preferredTimeZone ? { preferredTimeZone: record.preferredTimeZone } : {}),
      quietHours: {
        enabled: record?.quietHours?.enabled ?? false,
        startMinute: record?.quietHours?.startMinute ?? 1320,
        endMinute: record?.quietHours?.endMinute ?? 420,
      },
      mutedCourseIds: [...muted],
      overrides: (record?.overrides ?? []).map((override) => ({
        scheduleId: id(override.scheduleId),
        enabled: override.enabled,
        ...(override.offsetMinutes ? { offsetMinutes: override.offsetMinutes } : {}),
        ...(override.channels?.length ? { channels: override.channels } : {}),
      })),
      channelAvailability,
      courses: courses.map((course) => ({ ...course, muted: muted.has(course.id) })),
      ...(pushPublicKey ? { pushPublicKey } : {}),
      pushSubscribed,
      ...(recordUpdatedAt ? { updatedAt: recordUpdatedAt.toISOString() } : {}),
    };
  }

  async updatePreference(
    actor: RequestActor,
    input: UpdateReminderPreferenceInput,
  ): Promise<ReminderPreference> {
    if (!['student', 'lecturer'].includes(actor.role))
      throw Object.assign(new Error('Class reminders are available to students and educators.'), {
        statusCode: 403,
      });
    const [previous, policy, courses, availability] = await Promise.all([
      this.getPreference(actor),
      this.policy(actor.universityId),
      this.courseOptions(actor),
      this.policy(actor.universityId).then((value) =>
        this.availability(actor.universityId, actor.id, value),
      ),
    ]);
    if (input.defaultOffsetMinutes > policy.maximumWindowMinutes)
      throw Object.assign(new Error('Reminder offset exceeds the institution maximum.'), {
        statusCode: 422,
      });
    const available = new Set(
      availability.filter((item) => item.available).map((item) => item.channel),
    );
    const unavailableChannel = input.channels.find((channel) => !available.has(channel));
    if (unavailableChannel)
      throw Object.assign(new Error(`${unavailableChannel} reminders are currently unavailable.`), {
        statusCode: 409,
      });
    const unavailableOverrideChannel = input.overrides
      .flatMap((override) => override.channels ?? [])
      .find((channel) => !available.has(channel));
    if (unavailableOverrideChannel)
      throw Object.assign(
        new Error(`${unavailableOverrideChannel} reminders are currently unavailable.`),
        { statusCode: 409 },
      );
    const permittedCourses = new Set(courses.map((course) => course.id));
    if (input.mutedCourseIds.some((courseId) => !permittedCourses.has(courseId)))
      throw Object.assign(new Error('A muted course is outside your permitted scope.'), {
        statusCode: 403,
      });
    if (
      input.overrides.some(
        (override) =>
          (override.offsetMinutes ?? input.defaultOffsetMinutes) > policy.maximumWindowMinutes,
      )
    )
      throw Object.assign(new Error('A class override exceeds the institution maximum.'), {
        statusCode: 422,
      });
    const scheduleIds = input.overrides.map((override) => override.scheduleId);
    if (scheduleIds.length) {
      const permittedSchedules = await ClassScheduleModel.countDocuments({
        _id: { $in: scheduleIds },
        universityId: actor.universityId,
        courseId: { $in: [...permittedCourses] },
      });
      if (permittedSchedules !== unique(scheduleIds).length)
        throw Object.assign(new Error('A class override is outside your permitted scope.'), {
          statusCode: 403,
        });
    }
    await ReminderPreferenceModel.findOneAndUpdate(
      { universityId: actor.universityId, userId: actor.id },
      {
        $set: { ...input, updatedBy: actor.id },
        $setOnInsert: { universityId: actor.universityId, userId: actor.id, createdBy: actor.id },
      },
      { upsert: true, runValidators: true },
    ).exec();
    const updated = await this.getPreference(actor);
    await auditService.record({
      action: 'reminder.preference.updated',
      resourceType: 'reminder_preference',
      resourceId: actor.id,
      actor,
      oldValue: previous,
      newValue: updated,
    });
    socketService.emitToUser(actor.id, 'reminder-preference:updated', updated);
    await this.reconcileUser(actor);
    return updated;
  }

  async resetPreference(actor: RequestActor): Promise<ReminderPreference> {
    if (!['student', 'lecturer'].includes(actor.role))
      throw Object.assign(new Error('Class reminders are available to students and educators.'), {
        statusCode: 403,
      });
    const previous = await this.getPreference(actor);
    await ReminderPreferenceModel.deleteOne({
      universityId: actor.universityId,
      userId: actor.id,
    }).exec();
    const updated = await this.getPreference(actor);
    await auditService.record({
      action: 'reminder.preference.reset',
      resourceType: 'reminder_preference',
      resourceId: actor.id,
      actor,
      oldValue: previous,
      newValue: updated,
    });
    socketService.emitToUser(actor.id, 'reminder-preference:updated', updated);
    await this.reconcileUser(actor);
    return updated;
  }

  async history(
    actor: RequestActor,
    input: { readonly page: number; readonly limit: number },
  ): Promise<ReminderHistoryPage> {
    const filter = { universityId: actor.universityId, userId: actor.id };
    const [rows, total] = await Promise.all([
      ScheduledNotificationModel.find(filter)
        .select(
          'scheduleId courseId channel scheduledFor status attemptCount deliveredAt failureCode createdAt',
        )
        .populate('courseId', 'code title')
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      ScheduledNotificationModel.countDocuments(filter),
    ]);
    return {
      items: rows.map((row) => {
        const course = row.courseId as unknown as { code?: string; title?: string };
        return {
          id: id(row._id),
          scheduleId: id(row.scheduleId),
          courseCode: course.code ?? 'Course',
          courseTitle: course.title ?? 'Scheduled class',
          channel: row.channel,
          scheduledFor: row.scheduledFor.toISOString(),
          status: row.status,
          attemptCount: row.attemptCount,
          ...(row.deliveredAt ? { deliveredAt: row.deliveredAt.toISOString() } : {}),
          ...(row.failureCode ? { failureCode: row.failureCode } : {}),
          createdAt: (
            (row as typeof row & { createdAt?: Date }).createdAt ?? new Date()
          ).toISOString(),
        };
      }),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    };
  }

  async subscribePush(
    actor: RequestActor,
    input: {
      readonly endpoint: string;
      readonly expirationTime?: number | null;
      readonly keys: { readonly p256dh: string; readonly auth: string };
    },
  ): Promise<ReminderPreference> {
    await pushDeliveryService.subscribe(actor.universityId, actor.id, input);
    await auditService.record({
      action: 'push_subscription.created',
      resourceType: 'push_subscription',
      resourceId: actor.id,
      actor,
      metadata: { endpointStoredPrivately: true },
    });
    return this.getPreference(actor);
  }

  async revokePush(actor: RequestActor, endpoint: string): Promise<ReminderPreference> {
    await pushDeliveryService.revoke(actor.universityId, actor.id, endpoint);
    await auditService.record({
      action: 'push_subscription.revoked',
      resourceType: 'push_subscription',
      resourceId: actor.id,
      actor,
    });
    return this.getPreference(actor);
  }

  async testChannel(actor: RequestActor, channel: NotificationChannel): Promise<void> {
    const policy = await this.policy(actor.universityId);
    const availability = await this.availability(actor.universityId, actor.id, policy);
    if (!availability.find((item) => item.channel === channel)?.available)
      throw Object.assign(new Error('The selected reminder channel is unavailable.'), {
        statusCode: 409,
      });
    const user = await UserModel.findOne({ _id: actor.id, universityId: actor.universityId })
      .select('email firstName lastName')
      .lean()
      .exec();
    if (!user) throw Object.assign(new Error('Account was not found.'), { statusCode: 404 });
    const fullName = `${user.firstName} ${user.lastName}`;
    if (channel === 'in_app')
      await notificationService.create({
        universityId: actor.universityId,
        recipientId: actor.id,
        title: 'Reminder channel test',
        body: 'Your Attendity in-app reminder channel is working.',
        category: 'reminder_test',
        metadata: { channel },
      });
    else if (channel === 'email') await emailService.sendReminderTest(user.email, fullName);
    else if (channel === 'push')
      await pushDeliveryService.send(actor.universityId, actor.id, {
        title: 'Attendity reminder test',
        body: 'Your push reminder channel is working.',
        url: '/app/account',
        tag: `attendity-reminder-test-${actor.id}`,
      });
    else throw Object.assign(new Error('SMS delivery is not configured.'), { statusCode: 409 });
  }

  async cancelScheduleDeliveries(universityId: string, scheduleId: string, actorId: string) {
    await ScheduledNotificationModel.updateMany(
      {
        universityId,
        scheduleId,
        status: { $in: ['pending', 'processing', 'failed'] },
      },
      { $set: { status: 'cancelled', failureCode: 'schedule_changed', updatedBy: actorId } },
    ).exec();
  }

  async reconcileSchedule(scheduleId: string): Promise<void> {
    const schedule = await ClassScheduleModel.findById(scheduleId).lean().exec();
    if (!schedule) return;
    await this.cancelScheduleDeliveries(
      id(schedule.universityId),
      scheduleId,
      id(schedule.updatedBy ?? schedule.lecturerId),
    );
    if (schedule.status !== 'scheduled' || schedule.startsAt <= new Date()) return;
    const registrations = await CourseRegistrationModel.find({
      universityId: schedule.universityId,
      courseId: schedule.courseId,
      status: 'approved',
    })
      .select('studentId')
      .lean()
      .exec();
    const userIds = unique([
      id(schedule.lecturerId),
      ...registrations.map((registration) => id(registration.studentId)),
    ]);
    const [preferences, policy] = await Promise.all([
      ReminderPreferenceModel.find({
        universityId: schedule.universityId,
        userId: { $in: userIds },
      })
        .lean()
        .exec(),
      this.policy(id(schedule.universityId)),
    ]);
    const preferenceMap = new Map(
      preferences.map((preference) => [id(preference.userId), preference]),
    );
    const operations: Parameters<typeof ScheduledNotificationModel.bulkWrite>[0] = [];
    for (const userId of userIds) {
      const preference = preferenceMap.get(userId);
      if (preference && !preference.enabled) continue;
      if (preference?.mutedCourseIds?.some((courseId) => id(courseId) === id(schedule.courseId)))
        continue;
      const override = preference?.overrides?.find(
        (item) => id(item.scheduleId) === id(schedule._id),
      );
      if (override && !override.enabled) continue;
      const offset = Math.min(
        override?.offsetMinutes ?? preference?.defaultOffsetMinutes ?? 30,
        policy.maximumWindowMinutes,
      );
      const selectedChannels = (
        override?.channels?.length
          ? override.channels
          : preference?.channels?.length
            ? preference.channels
            : ['in_app']
      ) as readonly NotificationChannel[];
      const channelAvailability = await this.availability(
        id(schedule.universityId),
        userId,
        policy,
      );
      const availableChannels = new Set(
        channelAvailability.filter((item) => item.available).map((item) => item.channel),
      );
      const desired = new Date(schedule.startsAt.getTime() - offset * 60_000);
      const candidate = desired < new Date() ? new Date() : desired;
      const adjusted = quietAdjustedTime(
        candidate,
        schedule.startsAt,
        preference?.preferredTimeZone ?? schedule.timeZone,
        {
          enabled: preference?.quietHours?.enabled ?? false,
          startMinute: preference?.quietHours?.startMinute ?? 1320,
          endMinute: preference?.quietHours?.endMinute ?? 420,
        },
      );
      for (const channel of unique(selectedChannels)) {
        const canDeliver = availableChannels.has(channel);
        const idempotencyKey = `${id(schedule._id)}:${schedule.revision}:${userId}:${channel}:class_reminder`;
        operations.push({
          updateOne: {
            filter: { universityId: schedule.universityId, idempotencyKey },
            update: {
              $set: {
                scheduleRevision: schedule.revision,
                scheduledFor: adjusted ?? candidate,
                status: canDeliver && adjusted ? 'pending' : 'skipped',
                failureCode: canDeliver
                  ? adjusted
                    ? null
                    : 'quiet_hours_window'
                  : 'channel_unavailable',
                attemptCount: 0,
                updatedBy: userId,
              },
              $unset: { nextAttemptAt: 1, claimedAt: 1, deliveredAt: 1 },
              $setOnInsert: {
                universityId: schedule.universityId,
                userId,
                scheduleId: schedule._id,
                courseId: schedule.courseId,
                channel,
                kind: 'class_reminder',
                idempotencyKey,
                createdBy: userId,
              },
            },
            upsert: true,
          },
        });
      }
    }
    if (operations.length)
      await ScheduledNotificationModel.bulkWrite(operations, { ordered: false });
    for (const userId of userIds)
      socketService.emitToUser(userId, 'class-reminder:created', { scheduleId });
  }

  async reconcileUser(actor: RequestActor): Promise<void> {
    const courses = await this.courseOptions(actor);
    const schedules = await ClassScheduleModel.find({
      universityId: actor.universityId,
      courseId: { $in: courses.map((course) => course.id) },
      status: 'scheduled',
      startsAt: { $gt: new Date() },
    })
      .select('_id')
      .limit(500)
      .lean()
      .exec();
    for (const schedule of schedules) await this.reconcileSchedule(id(schedule._id));
  }

  async notifyScheduleChange(
    universityId: string,
    scheduleId: string,
    input: { readonly title: string; readonly body: string; readonly category: string },
  ): Promise<void> {
    const schedule = await ClassScheduleModel.findOne({ _id: scheduleId, universityId })
      .select('lecturerId courseId')
      .lean()
      .exec();
    if (!schedule) return;
    const registrations = await CourseRegistrationModel.find({
      universityId,
      courseId: schedule.courseId,
      status: 'approved',
    })
      .select('studentId')
      .lean()
      .exec();
    const recipients = unique([
      id(schedule.lecturerId),
      ...registrations.map((registration) => id(registration.studentId)),
    ]);
    await notificationService.createMany(
      recipients.map((recipientId) => ({
        universityId,
        recipientId,
        title: input.title,
        body: input.body,
        category: input.category,
        priority: 'high' as const,
        metadata: { scheduleId, courseId: id(schedule.courseId) },
      })),
    );
  }

  async deliverScheduled(deliveryId: string): Promise<void> {
    const delivery = await ScheduledNotificationModel.findOne({
      _id: deliveryId,
      status: 'processing',
    })
      .lean()
      .exec();
    if (!delivery) return;
    const [schedule, course, user] = await Promise.all([
      ClassScheduleModel.findOne({
        _id: delivery.scheduleId,
        universityId: delivery.universityId,
      })
        .lean()
        .exec(),
      CourseModel.findOne({ _id: delivery.courseId, universityId: delivery.universityId })
        .select('code title')
        .lean()
        .exec(),
      UserModel.findOne({ _id: delivery.userId, universityId: delivery.universityId })
        .select('email firstName lastName')
        .lean()
        .exec(),
    ]);
    if (
      !schedule ||
      schedule.status !== 'scheduled' ||
      schedule.revision !== delivery.scheduleRevision ||
      !course ||
      !user
    )
      throw Object.assign(new Error('Reminder source is no longer available.'), {
        code: 'source_unavailable',
      });
    const preference = await ReminderPreferenceModel.findOne({
      universityId: delivery.universityId,
      userId: delivery.userId,
    })
      .select('preferredTimeZone')
      .lean()
      .exec();
    const startsAtLabel = new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: preference?.preferredTimeZone ?? schedule.timeZone,
    }).format(schedule.startsAt);
    const courseLabel = `${course.code} — ${course.title}`;
    const fullName = `${user.firstName} ${user.lastName}`;
    const stillClaimed = await ScheduledNotificationModel.exists({
      _id: delivery._id,
      status: 'processing',
      scheduleRevision: schedule.revision,
    });
    if (!stillClaimed) return;
    if (delivery.channel === 'in_app')
      await notificationService.create({
        universityId: id(delivery.universityId),
        recipientId: id(delivery.userId),
        title: `${course.code} starts soon`,
        body: `${courseLabel} starts ${startsAtLabel} at ${schedule.venue}.`,
        category: 'class_reminder',
        priority: 'high',
        metadata: { scheduleId: id(schedule._id), courseId: id(course._id) },
        deliveryKey: delivery.idempotencyKey,
      });
    else if (delivery.channel === 'email')
      await emailService.sendClassReminder(user.email, fullName, {
        courseLabel,
        startsAtLabel,
        venue: schedule.venue,
      });
    else if (delivery.channel === 'push')
      await pushDeliveryService.send(id(delivery.universityId), id(delivery.userId), {
        title: `${course.code} starts soon`,
        body: `${startsAtLabel} · ${schedule.venue}`,
        url: '/app/account',
        tag: delivery.idempotencyKey,
      });
    else
      throw Object.assign(new Error('SMS delivery is unavailable.'), {
        code: 'channel_unavailable',
      });
    await ScheduledNotificationModel.updateOne(
      { _id: delivery._id, status: 'processing' },
      {
        $set: {
          status: 'delivered',
          deliveredAt: new Date(),
          failureCode: undefined,
          updatedBy: delivery.userId,
        },
        $unset: { nextAttemptAt: 1, claimedAt: 1 },
      },
    ).exec();
  }
}

export const reminderService = new ReminderService();
