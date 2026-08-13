import type { RequestActor } from '@qr/types';
import type { Types } from 'mongoose';
import { NotificationModel } from '../models/notification.model.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { socketService } from '../socket/socket.service.js';
export interface CreateNotificationInput {
  readonly universityId: string;
  readonly recipientId: string;
  readonly title: string;
  readonly body: string;
  readonly category: string;
  readonly priority?: 'low' | 'normal' | 'high' | 'urgent';
  readonly metadata?: Record<string, unknown>;
  readonly deliveryKey?: string;
}
export class NotificationService {
  async create(input: CreateNotificationInput): Promise<void> {
    try {
      const notification = await NotificationModel.create({
        ...input,
        recipientId: input.recipientId as unknown as Types.ObjectId,
        metadata: input.metadata ?? {},
      });
      socketService.emitToUser(input.recipientId, 'notification:sent', notification.toJSON());
    } catch (error) {
      if (
        input.deliveryKey &&
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      )
        return;
      throw error;
    }
  }

  async createMany(inputs: readonly CreateNotificationInput[]): Promise<void> {
    if (!inputs.length) return;
    const notifications = await NotificationModel.insertMany(
      inputs.map((input) => ({
        ...input,
        recipientId: input.recipientId as unknown as Types.ObjectId,
        metadata: input.metadata ?? {},
      })),
    );
    notifications.forEach((notification, index) => {
      const recipientId = inputs[index]?.recipientId;
      if (recipientId)
        socketService.emitToUser(recipientId, 'notification:sent', notification.toJSON());
    });
  }

  list(
    actor: RequestActor,
    input: {
      readonly status: 'all' | 'unread' | 'read' | 'archived';
      readonly page: number;
      readonly limit: number;
    },
  ) {
    return notificationRepository.list(actor.universityId, actor.id, input);
  }

  markRead(actor: RequestActor, notificationId: string) {
    return notificationRepository.update(actor.universityId, actor.id, notificationId, {
      readAt: new Date(),
      updatedBy: actor.id,
    });
  }

  archive(actor: RequestActor, notificationId: string) {
    return notificationRepository.update(actor.universityId, actor.id, notificationId, {
      archivedAt: new Date(),
      updatedBy: actor.id,
    });
  }

  remove(actor: RequestActor, notificationId: string) {
    return notificationRepository.update(actor.universityId, actor.id, notificationId, {
      deletedAt: new Date(),
      updatedBy: actor.id,
    });
  }

  markAllRead(actor: RequestActor) {
    return notificationRepository.markAllRead(actor.universityId, actor.id);
  }
}
export const notificationService = new NotificationService();
