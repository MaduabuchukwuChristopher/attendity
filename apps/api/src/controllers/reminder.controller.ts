import type { RequestHandler } from 'express';
import { reminderService } from '../services/reminder.service.js';
import {
  reminderChannelSchema,
  reminderHistoryQuerySchema,
} from '../validators/reminder.validator.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

export const getReminderPreference: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Reminder preferences retrieved.',
      data: await reminderService.getPreference(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateReminderPreference: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Reminder preferences updated.',
      data: await reminderService.updatePreference(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const resetReminderPreference: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Reminder preferences restored to defaults.',
      data: await reminderService.resetPreference(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const listReminderHistory: RequestHandler = async (request, response, next) => {
  try {
    const query = reminderHistoryQuerySchema.parse({ query: request.query }).query;
    response.json({
      success: true,
      message: 'Private reminder delivery history retrieved.',
      data: await reminderService.history(actor(request), query),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const testReminderChannel: RequestHandler = async (request, response, next) => {
  try {
    const { channel } = reminderChannelSchema.parse({ params: request.params }).params;
    await reminderService.testChannel(actor(request), channel);
    response.json({
      success: true,
      message: 'Reminder channel test sent.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const subscribePush: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'This device can now receive class reminder pushes.',
      data: await reminderService.subscribePush(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const revokePush: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Push reminders disabled on this device.',
      data: await reminderService.revokePush(actor(request), String(request.body.endpoint)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
