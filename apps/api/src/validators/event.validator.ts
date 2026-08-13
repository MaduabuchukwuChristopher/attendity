import {
  EVENT_ATTENDANCE_METHODS,
  EVENT_PARTICIPATION_STATUSES,
  EVENT_STATUSES,
  EVENT_TYPES,
  USER_ROLES,
} from '@qr/shared';
import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid record identifier is required.');
const isoDateTime = z.iso.datetime({ offset: true });
const channels = z.enum(['in_app', 'email', 'push', 'sms']);
const plainText = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine((value) => !/[<>]/.test(value), 'Use plain text without HTML markup.');

const audience = z.object({
  campus: plainText(1, 160).optional(),
  facultyName: plainText(1, 160).optional(),
  departmentId: objectId.optional(),
  programme: plainText(1, 160).optional(),
  level: plainText(1, 40).optional(),
  roles: z.array(z.enum(USER_ROLES)).max(USER_ROLES.length).default(['student']),
});

const attachment = z.object({
  assetId: objectId.optional(),
  name: plainText(1, 180),
  url: z
    .url()
    .max(2048)
    .refine((value) => value.startsWith('https://'), 'HTTPS is required.'),
  mimeType: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
});

const eventFieldsBase = z.object({
  title: plainText(3, 180),
  description: plainText(10, 5000),
  eventType: z.enum(EVENT_TYPES),
  customType: plainText(2, 100).optional(),
  campus: plainText(1, 160).optional(),
  venue: plainText(2, 240),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  timeZone: z.string().trim().min(1).max(80).default('UTC'),
  academicSessionId: objectId.optional(),
  termId: objectId.optional(),
  capacity: z.number().int().min(1).max(100_000).optional(),
  registrationRequired: z.boolean().default(false),
  mandatory: z.boolean().default(false),
  audience: audience.default({ roles: ['student'] }),
  reminderOffsetsMinutes: z.array(z.number().int().min(5).max(43_200)).max(8).default([1440, 60]),
  notificationChannels: z.array(channels).min(1).max(4).default(['in_app']),
  postEventMessage: plainText(3, 1000).optional(),
  participantReportAvailable: z.boolean().default(false),
  attendanceMethods: z
    .array(z.enum(EVENT_ATTENDANCE_METHODS))
    .min(1)
    .max(EVENT_ATTENDANCE_METHODS.length)
    .default(['dynamic_qr']),
  qrRotationSeconds: z.number().int().min(30).max(120).default(60),
  gps: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      maximumRadiusMetres: z.number().int().min(10).max(5000).default(100),
    })
    .optional(),
  faceVerificationRequired: z.boolean().default(false),
  manualAttendanceAllowed: z.boolean().default(false),
  pinAttendanceAllowed: z.boolean().default(false),
  attendancePin: z
    .string()
    .regex(/^\d{6,10}$/, 'Use a secure 6 to 10 digit PIN.')
    .optional(),
  bannerUrl: z
    .url()
    .max(2048)
    .refine((value) => value.startsWith('https://'), 'HTTPS is required.')
    .optional(),
  attachments: z.array(attachment).max(10).default([]),
});

const eventFields = eventFieldsBase.superRefine((value, context) => {
  if (Date.parse(value.endsAt) <= Date.parse(value.startsAt))
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'End time must follow start time.',
    });
  if (value.eventType === 'custom' && !value.customType)
    context.addIssue({
      code: 'custom',
      path: ['customType'],
      message: 'Name the custom event type.',
    });
  if (value.attendanceMethods.includes('gps') && !value.gps)
    context.addIssue({
      code: 'custom',
      path: ['gps'],
      message: 'GPS venue coordinates are required.',
    });
  if (value.attendanceMethods.includes('face') && !value.faceVerificationRequired)
    context.addIssue({
      code: 'custom',
      path: ['faceVerificationRequired'],
      message: 'Enable face verification for the selected method.',
    });
  if (value.attendanceMethods.includes('manual') && !value.manualAttendanceAllowed)
    context.addIssue({
      code: 'custom',
      path: ['manualAttendanceAllowed'],
      message: 'Enable manual attendance for the selected method.',
    });
  if (
    value.attendanceMethods.includes('pin') &&
    (!value.pinAttendanceAllowed || !value.attendancePin)
  )
    context.addIssue({
      code: 'custom',
      path: ['attendancePin'],
      message: 'Enable PIN attendance and provide a secure PIN.',
    });
});

export const createEventSchema = z.object({ body: eventFields });
export type CreateEventInput = z.infer<typeof eventFields>;

export const updateEventSchema = z.object({
  params: z.object({ eventId: objectId }),
  body: eventFieldsBase.partial().superRefine((value, context) => {
    if (value.startsAt && value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt))
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'End time must follow start time.',
      });
  }),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>['body'];

export const eventIdentifierSchema = z.object({ params: z.object({ eventId: objectId }) });
const analyticsQuery = z
  .object({
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
  })
  .refine(
    (value) => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to),
    'The analytics start date must be before the end date.',
  );
export const eventAnalyticsQuerySchema = z.object({
  params: z.object({ eventId: objectId }),
  query: analyticsQuery,
});
export const eventParticipantListSchema = z.object({
  params: z.object({ eventId: objectId }),
  query: z.object({
    search: z.string().trim().max(100).default(''),
    status: z.enum([...EVENT_PARTICIPATION_STATUSES, 'all']).default('all'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(25),
  }),
});
export type EventParticipantListInput = z.infer<typeof eventParticipantListSchema>['query'];
export const eventHistoryQuerySchema = z.object({
  query: z.object({
    academicSessionId: objectId.optional(),
    termId: objectId.optional(),
    eventType: z.enum([...EVENT_TYPES, 'all']).default('all'),
    mandatory: z.enum(['all', 'true', 'false']).default('all'),
    status: z.enum([...EVENT_PARTICIPATION_STATUSES, 'all']).default('all'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(25),
  }),
});
export type EventHistoryInput = z.infer<typeof eventHistoryQuerySchema>['query'];
export const eventListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).default(''),
    status: z.enum([...EVENT_STATUSES, 'all']).default('all'),
    eventType: z.enum([...EVENT_TYPES, 'all']).default('all'),
    mandatory: z.enum(['all', 'true', 'false']).default('all'),
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
  }),
});
export type EventListInput = z.infer<typeof eventListSchema>['query'];

export const cancelEventSchema = z.object({
  params: z.object({ eventId: objectId }),
  body: z.object({ reason: z.string().trim().min(3).max(500) }),
});
export const excuseEventParticipantSchema = z.object({
  params: z.object({ eventId: objectId, userId: objectId }),
  body: z.object({ reason: z.string().trim().min(3).max(500) }),
});
export const eventSessionSchema = z.object({
  params: z.object({ eventId: objectId }),
  body: z.object({ durationMinutes: z.number().int().min(5).max(720).default(60) }),
});
export const eventSessionIdentifierSchema = z.object({
  params: z.object({ eventId: objectId, sessionId: objectId }),
});
const imageCapture = z
  .string()
  .max(950_000)
  .regex(/^data:image\/(?:jpeg|png|webp);base64,/i, 'A valid camera capture is required.');
export const eventCheckInSchema = z.object({
  params: z.object({ eventId: objectId }),
  body: z
    .object({
      code: z.string().trim().toUpperCase().min(8).max(32).optional(),
      token: z.string().trim().min(80).max(2048).optional(),
      pin: z
        .string()
        .regex(/^\d{6,10}$/)
        .optional(),
      gps: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          accuracy: z.number().min(0).max(500),
        })
        .optional(),
      imageCapture: imageCapture.optional(),
    })
    .refine((value) => Boolean(value.code || value.token || value.pin), {
      message: 'A dynamic QR credential or event PIN is required.',
    }),
});
export const eventRequirementsSchema = z.object({
  params: z.object({ eventId: objectId }),
  body: z.object({
    code: z.string().trim().toUpperCase().min(8).max(32).optional(),
    token: z.string().trim().min(80).max(2048).optional(),
    pin: z
      .string()
      .regex(/^\d{6,10}$/)
      .optional(),
  }),
});
export const manualEventAttendanceSchema = z.object({
  params: z.object({ eventId: objectId }),
  body: z.object({
    userId: objectId,
    status: z.enum(EVENT_PARTICIPATION_STATUSES).exclude(['absent', 'pending']),
    reason: z.string().trim().min(3).max(500),
  }),
});
export const eventAnalyticsExportSchema = z.object({
  params: z.object({ eventId: objectId, format: z.enum(['csv', 'xlsx', 'pdf']) }),
  query: analyticsQuery,
});
