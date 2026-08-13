import type { RequestHandler } from 'express';
import { notificationService } from '../services/notification.service.js';
import { notificationListQuerySchema } from '../validators/notification.validator.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

function notificationId(request: Parameters<RequestHandler>[0]): string {
  const value = request.params.notificationId;
  if (typeof value !== 'string')
    throw Object.assign(new Error('Notification was not found.'), { statusCode: 404 });
  return value;
}

export const listNotifications: RequestHandler = async (request, response, next) => {
  try {
    const query = notificationListQuerySchema.parse({ query: request.query }).query;
    response.json({
      success: true,
      message: 'Notifications retrieved.',
      data: await notificationService.list(actor(request), query),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Notification marked as read.',
      data: await notificationService.markRead(actor(request), notificationId(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const archiveNotification: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Notification archived.',
      data: await notificationService.archive(actor(request), notificationId(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification: RequestHandler = async (request, response, next) => {
  try {
    await notificationService.remove(actor(request), notificationId(request));
    response.json({
      success: true,
      message: 'Notification deleted.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead: RequestHandler = async (request, response, next) => {
  try {
    const modified = await notificationService.markAllRead(actor(request));
    response.json({
      success: true,
      message: 'All notifications marked as read.',
      data: { modified },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
