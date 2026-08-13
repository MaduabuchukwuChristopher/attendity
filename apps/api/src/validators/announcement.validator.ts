import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PRIORITIES, USER_ROLES } from '@qr/shared';
import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const dateTime = z.iso.datetime({ offset: true });
const plainText = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine((value) => !/[<>]/.test(value), 'Use plain text without HTML markup.');

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

const audience = z.object({
  campus: plainText(1, 160).optional(),
  facultyName: plainText(1, 160).optional(),
  departmentId: objectId.optional(),
  programme: plainText(1, 160).optional(),
  level: plainText(1, 40).optional(),
  courseId: objectId.optional(),
  roles: z.array(z.enum(USER_ROLES)).max(USER_ROLES.length).default([]),
});

const announcementFields = z.object({
  title: plainText(3, 180),
  message: plainText(3, 5000),
  category: z.enum(ANNOUNCEMENT_CATEGORIES),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).default('normal'),
  audience,
  expiresAt: dateTime.optional(),
  attachments: z.array(attachment).max(8).default([]),
  pinned: z.boolean().default(false),
  acknowledgementRequired: z.boolean().default(false),
  channels: z
    .array(z.enum(['in_app', 'email', 'push', 'sms']))
    .min(1)
    .max(4)
    .default(['in_app']),
});

export const createAnnouncementSchema = z.object({ body: announcementFields });
export const updateAnnouncementSchema = z.object({
  params: z.object({ announcementId: objectId }),
  body: announcementFields
    .partial()
    .refine((value) => Object.keys(value).length > 0, 'Provide an announcement field to update.'),
});
export const announcementIdentifierSchema = z.object({
  params: z.object({ announcementId: objectId }),
});
export const scheduleAnnouncementSchema = z.object({
  params: z.object({ announcementId: objectId }),
  body: z.object({ publishAt: dateTime }),
});
export const cancelAnnouncementSchema = z.object({
  params: z.object({ announcementId: objectId }),
  body: z.object({ reason: plainText(3, 300) }),
});
export const pinAnnouncementSchema = z.object({
  params: z.object({ announcementId: objectId }),
  body: z.object({ pinned: z.boolean() }),
});
export const announcementListQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).default(''),
    category: z.enum([...ANNOUNCEMENT_CATEGORIES, 'all']).default('all'),
    priority: z.enum([...ANNOUNCEMENT_PRIORITIES, 'all']).default('all'),
    status: z.enum(['all', 'unread', 'read', 'acknowledged']).default('all'),
    sort: z.enum(['newest', 'oldest', 'priority', 'expires_soon']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(20),
  }),
});
export const announcementManagementQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).default(''),
    status: z
      .enum(['all', 'draft', 'scheduled', 'published', 'archived', 'cancelled'])
      .default('all'),
    sort: z.enum(['newest', 'oldest', 'priority', 'expires_soon']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(20),
  }),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>['body'];
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>['body'];
export type AnnouncementListInput = z.infer<typeof announcementListQuerySchema>['query'];
export type AnnouncementManagementInput = z.infer<
  typeof announcementManagementQuerySchema
>['query'];
