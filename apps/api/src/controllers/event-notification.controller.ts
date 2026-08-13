import type { RequestHandler } from 'express';
import { eventNotificationService } from '../services/event-notification.service.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

export const getEventNotificationPreference: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Event notification preferences retrieved.',
      data: await eventNotificationService.getPreference(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateEventNotificationPreference: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.json({
      success: true,
      message: 'Event notification preferences updated.',
      data: await eventNotificationService.updatePreference(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
