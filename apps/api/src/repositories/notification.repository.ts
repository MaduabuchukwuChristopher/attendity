import type { AppNotification, NotificationPage } from '@qr/types';
import { NotificationModel } from '../models/notification.model.js';

function view(notification: {
  readonly _id: unknown;
  readonly title: string;
  readonly body: string;
  readonly category: string;
  readonly priority: 'low' | 'normal' | 'high' | 'urgent';
  readonly readAt?: Date | null;
  readonly archivedAt?: Date | null;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt?: Date;
}): AppNotification {
  return {
    id: String(notification._id),
    title: notification.title,
    body: notification.body,
    category: notification.category,
    priority: notification.priority,
    ...(notification.readAt ? { readAt: notification.readAt.toISOString() } : {}),
    ...(notification.archivedAt ? { archivedAt: notification.archivedAt.toISOString() } : {}),
    metadata: notification.metadata ?? {},
    createdAt: (notification.createdAt ?? new Date()).toISOString(),
  };
}

export class NotificationRepository {
  async list(
    universityId: string,
    recipientId: string,
    input: {
      readonly status: 'all' | 'unread' | 'read' | 'archived';
      readonly page: number;
      readonly limit: number;
    },
  ): Promise<NotificationPage> {
    const filter: Record<string, unknown> = { universityId, recipientId };
    if (input.status === 'unread') filter.readAt = { $exists: false };
    if (input.status === 'read') {
      filter.readAt = { $exists: true };
      filter.archivedAt = { $exists: false };
    }
    if (input.status === 'archived') filter.archivedAt = { $exists: true };
    if (input.status === 'all') filter.archivedAt = { $exists: false };
    const [items, total, unread] = await Promise.all([
      NotificationModel.find(filter)
        .select('title body category priority readAt archivedAt metadata createdAt')
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean()
        .exec(),
      NotificationModel.countDocuments(filter),
      NotificationModel.countDocuments({
        universityId,
        recipientId,
        readAt: { $exists: false },
        archivedAt: { $exists: false },
      }),
    ]);
    return {
      items: items.map(view),
      unread,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    };
  }

  async update(
    universityId: string,
    recipientId: string,
    notificationId: string,
    update: Readonly<Record<string, unknown>>,
  ): Promise<AppNotification> {
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, universityId, recipientId },
      { $set: update },
      { new: true },
    )
      .select('title body category priority readAt archivedAt metadata createdAt')
      .lean()
      .exec();
    if (!notification)
      throw Object.assign(new Error('Notification was not found.'), { statusCode: 404 });
    return view(notification);
  }

  async markAllRead(universityId: string, recipientId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      { universityId, recipientId, readAt: { $exists: false } },
      { $set: { readAt: new Date(), updatedBy: recipientId } },
    ).exec();
    return result.modifiedCount;
  }
}

export const notificationRepository = new NotificationRepository();
