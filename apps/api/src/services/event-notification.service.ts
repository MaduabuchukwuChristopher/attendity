import type {
  EventNotificationClassification,
  EventNotificationPreference,
  NotificationChannel,
  RequestActor,
} from '@qr/types';
import { EventNotificationPreferenceModel } from '../models/event-notification-preference.model.js';
import { EventNotificationDeliveryModel } from '../models/event-notification-delivery.model.js';
import { SystemSettingsModel } from '../models/system-settings.model.js';
import { UserModel } from '../models/user.model.js';
import type { UpdateEventNotificationPreferenceInput } from '../validators/event-notification.validator.js';
import { auditService } from './audit.service.js';
import { emailService } from './email.service.js';
import { notificationService } from './notification.service.js';
import { pushDeliveryService } from './push-delivery.service.js';

interface DeliveryInput {
  readonly universityId: string;
  readonly eventId: string;
  readonly recipientIds: readonly string[];
  readonly eventChannels: readonly NotificationChannel[];
  readonly classification: EventNotificationClassification;
  readonly kind: string;
  readonly title: string;
  readonly body: string;
  readonly priority: 'low' | 'normal' | 'high' | 'urgent';
  readonly occurrenceKey: string;
}

const defaults = {
  enabled: true,
  channels: ['in_app'] as const,
  informationalEnabled: true,
  operationalEnabled: true,
  postEventEnabled: true,
  reportAvailabilityEnabled: true,
};

interface PreferenceGate {
  readonly enabled: boolean;
  readonly informationalEnabled: boolean;
  readonly operationalEnabled: boolean;
  readonly postEventEnabled: boolean;
  readonly reportAvailabilityEnabled: boolean;
}

function statusError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function categoryEnabled(
  preference: PreferenceGate,
  classification: EventNotificationClassification,
  kind: string,
): boolean {
  if (classification === 'mandatory' || classification === 'security') return true;
  if (!preference.enabled) return false;
  if (kind === 'event_post_event') return preference.postEventEnabled;
  if (kind === 'event_report_available') return preference.reportAvailabilityEnabled;
  return classification === 'informational'
    ? preference.informationalEnabled
    : preference.operationalEnabled;
}

export class EventNotificationService {
  private failureCode(error: unknown): string {
    if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'string')
      return error.code.slice(0, 80);
    return 'delivery_failed';
  }

  private async queueExternal(input: {
    readonly universityId: string;
    readonly eventId: string;
    readonly recipientId: string;
    readonly recipientEmail: string;
    readonly recipientName: string;
    readonly channel: 'email' | 'push';
    readonly title: string;
    readonly body: string;
    readonly occurrenceKey: string;
  }): Promise<string> {
    const idempotencyKey = `${input.eventId}:${input.occurrenceKey}:${input.channel}:${input.recipientId}`;
    const { occurrenceKey: _occurrenceKey, ...delivery } = input;
    const record = await EventNotificationDeliveryModel.findOneAndUpdate(
      { universityId: input.universityId, idempotencyKey },
      {
        $setOnInsert: {
          ...delivery,
          url: `/app/events?event=${encodeURIComponent(input.eventId)}`,
          tag: `event-${input.eventId}-${input.occurrenceKey}`,
          status: 'pending',
          attemptCount: 0,
          idempotencyKey,
          createdBy: input.recipientId,
          updatedBy: input.recipientId,
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).exec();
    const recordId: unknown = record._id;
    return String(recordId);
  }

  async deliverQueued(deliveryId: string): Promise<void> {
    const now = new Date();
    const delivery = await EventNotificationDeliveryModel.findOneAndUpdate(
      {
        _id: deliveryId,
        attemptCount: { $lt: 5 },
        $or: [
          { status: 'pending' },
          { status: 'failed', nextAttemptAt: { $lte: now } },
          { status: 'processing', claimedAt: { $lte: new Date(now.getTime() - 5 * 60_000) } },
        ],
      },
      {
        $set: { status: 'processing', claimedAt: now },
        $inc: { attemptCount: 1 },
        $unset: { nextAttemptAt: 1 },
      },
      { new: true },
    )
      .select('+recipientEmail')
      .exec();
    if (!delivery) return;
    try {
      if (delivery.channel === 'email')
        await emailService.sendEventNotification(delivery.recipientEmail, delivery.recipientName, {
          title: delivery.title,
          message: delivery.body,
          eventId: String(delivery.eventId),
        });
      else
        await pushDeliveryService.send(
          String(delivery.universityId),
          String(delivery.recipientId),
          {
            title: delivery.title,
            body: delivery.body,
            url: delivery.url ?? '/app/events',
            tag: delivery.tag ?? `event-${String(delivery.eventId)}`,
          },
        );
      await EventNotificationDeliveryModel.updateOne(
        { _id: delivery._id, status: 'processing' },
        {
          $set: { status: 'delivered', deliveredAt: new Date(), updatedBy: delivery.recipientId },
          $unset: { claimedAt: 1, failureCode: 1, nextAttemptAt: 1 },
        },
      ).exec();
    } catch (error) {
      const retryMinutes = Math.min(60, 2 ** Math.max(0, delivery.attemptCount - 1));
      await EventNotificationDeliveryModel.updateOne(
        { _id: delivery._id, status: 'processing' },
        {
          $set: {
            status: 'failed',
            failureCode: this.failureCode(error),
            nextAttemptAt: new Date(Date.now() + retryMinutes * 60_000),
            updatedBy: delivery.recipientId,
          },
          $unset: { claimedAt: 1 },
        },
      ).exec();
      throw error;
    }
  }

  async processPending(limit = 100): Promise<number> {
    const now = new Date();
    const rows = await EventNotificationDeliveryModel.find({
      attemptCount: { $lt: 5 },
      $or: [
        { status: 'pending' },
        { status: 'failed', nextAttemptAt: { $lte: now } },
        { status: 'processing', claimedAt: { $lte: new Date(now.getTime() - 5 * 60_000) } },
      ],
    })
      .select('_id')
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()
      .exec();
    await Promise.allSettled(rows.map((row) => this.deliverQueued(String(row._id))));
    return rows.length;
  }
  private async availability(universityId: string) {
    const settings = await SystemSettingsModel.findOne({ universityId })
      .select('reminderAllowedChannels')
      .lean()
      .exec();
    const allowed: Readonly<Record<NotificationChannel, boolean>> = {
      in_app: settings?.reminderAllowedChannels?.inApp ?? true,
      email: settings?.reminderAllowedChannels?.email ?? true,
      push: settings?.reminderAllowedChannels?.push ?? true,
      sms: settings?.reminderAllowedChannels?.sms ?? false,
    };
    const configured: Readonly<Record<NotificationChannel, boolean>> = {
      in_app: true,
      email: emailService.isConfigured(),
      push: pushDeliveryService.isConfigured(),
      sms: false,
    };
    return (['in_app', 'email', 'push', 'sms'] as const).map((channel) => ({
      channel,
      allowed: allowed[channel],
      configured: configured[channel],
      available: allowed[channel] && configured[channel],
      ...(!allowed[channel]
        ? { reason: 'Disabled by institution policy.' }
        : !configured[channel]
          ? {
              reason:
                channel === 'sms'
                  ? 'SMS provider is not configured.'
                  : `${channel} delivery is not configured.`,
            }
          : {}),
    }));
  }

  async getPreference(actor: RequestActor): Promise<EventNotificationPreference> {
    const [record, channelAvailability] = await Promise.all([
      EventNotificationPreferenceModel.findOne({
        universityId: actor.universityId,
        userId: actor.id,
      })
        .lean()
        .exec(),
      this.availability(actor.universityId),
    ]);
    const value = record ?? defaults;
    return {
      enabled: value.enabled,
      channels: value.channels,
      informationalEnabled: value.informationalEnabled,
      operationalEnabled: value.operationalEnabled,
      postEventEnabled: value.postEventEnabled,
      reportAvailabilityEnabled: value.reportAvailabilityEnabled,
      lockedClassifications: ['security', 'mandatory'],
      channelAvailability,
      ...((record as unknown as { readonly updatedAt?: Date } | null)?.updatedAt
        ? { updatedAt: (record as unknown as { readonly updatedAt: Date }).updatedAt.toISOString() }
        : {}),
    };
  }

  async updatePreference(actor: RequestActor, input: UpdateEventNotificationPreferenceInput) {
    const availability = await this.availability(actor.universityId);
    const unavailable = input.channels.find(
      (channel) => !availability.find((item) => item.channel === channel)?.available,
    );
    if (unavailable) throw statusError(`${unavailable} event notifications are unavailable.`, 409);
    const record = await EventNotificationPreferenceModel.findOneAndUpdate(
      { universityId: actor.universityId, userId: actor.id },
      {
        $set: { ...input, updatedBy: actor.id },
        $setOnInsert: { universityId: actor.universityId, userId: actor.id, createdBy: actor.id },
      },
      { upsert: true, new: true, runValidators: true },
    ).exec();
    await auditService.record({
      action: 'event_notification.preference_updated',
      resourceType: 'event_notification_preference',
      resourceId: record.id,
      actor,
      newValue: input,
    });
    return this.getPreference(actor);
  }

  async deliver(input: DeliveryInput): Promise<void> {
    const recipientIds = [...new Set(input.recipientIds)];
    if (!recipientIds.length) return;
    const [users, preferences, availability] = await Promise.all([
      UserModel.find({
        _id: { $in: recipientIds },
        universityId: input.universityId,
        accountStatus: 'active',
      })
        .select('firstName lastName email')
        .lean()
        .exec(),
      EventNotificationPreferenceModel.find({
        universityId: input.universityId,
        userId: { $in: recipientIds },
      })
        .lean()
        .exec(),
      this.availability(input.universityId),
    ]);
    const preferenceMap = new Map(preferences.map((item) => [String(item.userId), item]));
    const channelAvailable = new Map(availability.map((item) => [item.channel, item.available]));
    for (let index = 0; index < users.length; index += 50) {
      await Promise.all(
        users.slice(index, index + 50).map(async (user) => {
          const userId = String(user._id);
          const preference = preferenceMap.get(userId) ?? defaults;
          if (!categoryEnabled(preference, input.classification, input.kind)) return;
          const preferenceChannels: readonly NotificationChannel[] = preference.channels;
          const channels = new Set<NotificationChannel>(
            input.eventChannels.filter(
              (channel) => preferenceChannels.includes(channel) && channelAvailable.get(channel),
            ),
          );
          if (input.classification === 'mandatory' || input.classification === 'security')
            channels.add('in_app');
          const metadata = {
            eventId: input.eventId,
            classification: input.classification,
            requestedChannels: input.eventChannels,
          };
          const deliveries: Promise<unknown>[] = [];
          if (channels.has('in_app'))
            deliveries.push(
              notificationService.create({
                universityId: input.universityId,
                recipientId: userId,
                title: input.title,
                body: input.body,
                category: input.kind,
                priority: input.priority,
                metadata,
                deliveryKey: `event:${input.eventId}:${input.occurrenceKey}:in_app:${userId}`,
              }),
            );
          for (const channel of ['email', 'push'] as const) {
            if (!channels.has(channel)) continue;
            const deliveryId = await this.queueExternal({
              universityId: input.universityId,
              eventId: input.eventId,
              recipientId: userId,
              recipientEmail: user.email,
              recipientName: `${user.firstName} ${user.lastName}`,
              channel,
              title: input.title,
              body: input.body,
              occurrenceKey: input.occurrenceKey,
            });
            deliveries.push(this.deliverQueued(deliveryId));
          }
          await Promise.allSettled(deliveries);
        }),
      );
    }
  }
}

export const eventNotificationService = new EventNotificationService();
