import type { RequestHandler } from 'express';
import { announcementService } from '../services/announcement.service.js';
import {
  announcementListQuerySchema,
  announcementManagementQuerySchema,
} from '../validators/announcement.validator.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

function identifier(request: Parameters<RequestHandler>[0]): string {
  const value = request.params.announcementId;
  if (typeof value !== 'string')
    throw Object.assign(new Error('Announcement was not found.'), { statusCode: 404 });
  return value;
}

function send(
  response: Parameters<RequestHandler>[1],
  message: string,
  data: unknown,
  status = 200,
) {
  response.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export const listAnnouncements: RequestHandler = async (request, response, next) => {
  try {
    const input = announcementListQuerySchema.parse({ query: request.query }).query;
    send(
      response,
      'Announcements retrieved.',
      await announcementService.listFeed(actor(request), input),
    );
  } catch (error) {
    next(error);
  }
};

export const listManagedAnnouncements: RequestHandler = async (request, response, next) => {
  try {
    const input = announcementManagementQuerySchema.parse({ query: request.query }).query;
    send(
      response,
      'Managed announcements retrieved.',
      await announcementService.listManagement(actor(request), input),
    );
  } catch (error) {
    next(error);
  }
};

export const getAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Announcement retrieved.',
      await announcementService.detail(actor(request), identifier(request)),
    );
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Announcement draft created.',
      await announcementService.create(actor(request), request.body),
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Announcement updated.',
      await announcementService.update(actor(request), identifier(request), request.body),
    );
  } catch (error) {
    next(error);
  }
};

export const scheduleAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Announcement scheduled.',
      await announcementService.schedule(
        actor(request),
        identifier(request),
        request.body.publishAt,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const publishAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Announcement published.',
      await announcementService.publish(actor(request), identifier(request)),
    );
  } catch (error) {
    next(error);
  }
};

export const archiveAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Announcement archived.',
      await announcementService.archive(actor(request), identifier(request)),
    );
  } catch (error) {
    next(error);
  }
};

export const cancelAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Announcement cancelled.',
      await announcementService.cancel(actor(request), identifier(request), request.body.reason),
    );
  } catch (error) {
    next(error);
  }
};

export const pinAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Announcement pin updated.',
      await announcementService.pin(actor(request), identifier(request), request.body.pinned),
    );
  } catch (error) {
    next(error);
  }
};

export const readAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    await announcementService.markRead(actor(request), identifier(request));
    send(response, 'Announcement marked as read.', null);
  } catch (error) {
    next(error);
  }
};

export const acknowledgeAnnouncement: RequestHandler = async (request, response, next) => {
  try {
    await announcementService.acknowledge(actor(request), identifier(request));
    send(response, 'Announcement acknowledged.', null);
  } catch (error) {
    next(error);
  }
};

export const announcementDelivery: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Announcement delivery retrieved.',
      await announcementService.delivery(actor(request), identifier(request)),
    );
  } catch (error) {
    next(error);
  }
};
