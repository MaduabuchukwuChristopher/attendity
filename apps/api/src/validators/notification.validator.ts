import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid notification identifier is required.');

export const notificationListQuerySchema = z.object({
  query: z.object({
    status: z.enum(['all', 'unread', 'read', 'archived']).default('all'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(20),
  }),
});

export const notificationIdentifierSchema = z.object({
  params: z.object({ notificationId: objectId }),
});
