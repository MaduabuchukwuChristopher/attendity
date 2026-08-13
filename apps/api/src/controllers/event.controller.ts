import type { RequestHandler } from 'express';
import { eventService } from '../services/event.service.js';
import { eventExportService } from '../services/event-export.service.js';
import { settingsService } from '../services/settings.service.js';
import { trustedMediaService } from '../services/trusted-media.service.js';
import {
  eventAnalyticsQuerySchema,
  eventHistoryQuerySchema,
  eventListSchema,
  eventParticipantListSchema,
} from '../validators/event.validator.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

function parameter(value: string | string[] | undefined, message: string): string {
  if (typeof value !== 'string') throw Object.assign(new Error(message), { statusCode: 404 });
  return value;
}

function eventId(request: Parameters<RequestHandler>[0]): string {
  return parameter(request.params.eventId, 'Event was not found.');
}

function send(
  response: Parameters<RequestHandler>[1],
  message: string,
  data: unknown,
  status = 200,
) {
  response
    .status(status)
    .json({ success: true, message, data, timestamp: new Date().toISOString() });
}

export const listEvents: RequestHandler = async (request, response, next) => {
  try {
    const input = eventListSchema.parse({ query: request.query }).query;
    send(response, 'Events retrieved.', await eventService.list(actor(request), input));
  } catch (error) {
    next(error);
  }
};

export const listManagedEvents: RequestHandler = async (request, response, next) => {
  try {
    const input = eventListSchema.parse({ query: request.query }).query;
    send(
      response,
      'Managed events retrieved.',
      await eventService.list(actor(request), input, true),
    );
  } catch (error) {
    next(error);
  }
};

export const getEvent: RequestHandler = async (request, response, next) => {
  try {
    send(response, 'Event retrieved.', await eventService.detail(actor(request), eventId(request)));
  } catch (error) {
    next(error);
  }
};

export const createEvent: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Event draft created.',
      await eventService.create(actor(request), request.body),
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const updateEvent: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Event updated.',
      await eventService.update(actor(request), eventId(request), request.body),
    );
  } catch (error) {
    next(error);
  }
};

export const publishEvent: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Event published.',
      await eventService.publish(actor(request), eventId(request)),
    );
  } catch (error) {
    next(error);
  }
};

export const registerForEvent: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Event registration confirmed.',
      await eventService.register(actor(request), eventId(request)),
    );
  } catch (error) {
    next(error);
  }
};

export const cancelEvent: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Event cancelled.',
      await eventService.cancel(actor(request), eventId(request), request.body.reason),
    );
  } catch (error) {
    next(error);
  }
};

export const archiveEvent: RequestHandler = async (request, response, next) => {
  try {
    send(response, 'Event archived.', await eventService.archive(actor(request), eventId(request)));
  } catch (error) {
    next(error);
  }
};

export const openEventAttendance: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Event attendance opened.',
      await eventService.openAttendance(
        actor(request),
        eventId(request),
        request.body.durationMinutes,
      ),
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const closeEventAttendance: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Event attendance closed.',
      await eventService.closeAttendance(
        actor(request),
        eventId(request),
        parameter(request.params.sessionId, 'Attendance session was not found.'),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getEventAttendanceRequirements: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Event attendance requirements retrieved.',
      await eventService.requirements(actor(request), eventId(request), request.body),
    );
  } catch (error) {
    next(error);
  }
};

export const checkInToEvent: RequestHandler = async (request, response, next) => {
  try {
    const ipAddress = request.ip;
    const userAgent = request.get('user-agent');
    send(
      response,
      'Event attendance recorded.',
      await eventService.checkIn(actor(request), eventId(request), request.body, {
        ...(ipAddress ? { ipAddress } : {}),
        ...(userAgent ? { userAgent } : {}),
      }),
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const recordManualEventAttendance: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Manual event attendance recorded.',
      await eventService.manualAttendance(actor(request), eventId(request), request.body),
    );
  } catch (error) {
    next(error);
  }
};

export const excuseEventParticipant: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Event absence excused.',
      await eventService.excuse(
        actor(request),
        eventId(request),
        parameter(request.params.userId, 'Participant was not found.'),
        request.body.reason,
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const listEventParticipants: RequestHandler = async (request, response, next) => {
  try {
    const input = eventParticipantListSchema.parse({ query: request.query }).query;
    send(
      response,
      'Event participants retrieved.',
      await eventService.participants(actor(request), eventId(request), input),
    );
  } catch (error) {
    next(error);
  }
};

export const getStudentEventHistory: RequestHandler = async (request, response, next) => {
  try {
    const input = eventHistoryQuerySchema.parse({ query: request.query }).query;
    send(
      response,
      'Event participation history retrieved.',
      await eventService.history(actor(request), input),
    );
  } catch (error) {
    next(error);
  }
};

export const getEventAnalytics: RequestHandler = async (request, response, next) => {
  try {
    const parsed = eventAnalyticsQuerySchema.parse({
      params: request.params,
      query: request.query,
    }).query;
    const input = {
      ...(parsed.from ? { from: parsed.from } : {}),
      ...(parsed.to ? { to: parsed.to } : {}),
    };
    send(
      response,
      'Event analytics retrieved.',
      await eventService.analytics(actor(request), eventId(request), input),
    );
  } catch (error) {
    next(error);
  }
};

export const exportEventAnalytics: RequestHandler = async (request, response, next) => {
  try {
    const currentActor = actor(request);
    const format = parameter(request.params.format, 'Export format was not found.');
    const parsed = eventAnalyticsQuerySchema.parse({
      params: request.params,
      query: request.query,
    }).query;
    const input = {
      ...(parsed.from ? { from: parsed.from } : {}),
      ...(parsed.to ? { to: parsed.to } : {}),
    };
    const [data, settings] = await Promise.all([
      eventService.analyticsExportData(currentActor, eventId(request), input),
      settingsService.get(currentActor),
    ]);
    const logo = await trustedMediaService.resolveImage({
      universityId: currentActor.universityId,
      ...(settings.logoAssetId ? { assetId: settings.logoAssetId } : {}),
      ...(settings.logoUrl ? { snapshotUrl: settings.logoUrl } : {}),
      contexts: ['institution_logo'],
    });
    const branding = {
      institutionName: settings.institutionName,
      ...(logo ? { logo } : {}),
    };
    const buffer =
      format === 'csv'
        ? eventExportService.csv(data.event, data.analytics, branding)
        : format === 'xlsx'
          ? await eventExportService.excel(data.event, data.analytics, branding)
          : await eventExportService.pdf(data.event, data.analytics, branding);
    const contentType =
      format === 'csv'
        ? 'text/csv; charset=utf-8'
        : format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf';
    response.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="event-${data.event.id}-analytics.${format}"`,
      'Content-Length': String(buffer.length),
    });
    response.send(buffer);
  } catch (error) {
    next(error);
  }
};
