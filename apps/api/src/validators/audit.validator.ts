import { z } from 'zod';

export const auditListSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).default(''),
    action: z.string().trim().max(120).default('all'),
    resourceType: z.string().trim().max(120).default('all'),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(25),
  }),
});

export type AuditListInput = z.infer<typeof auditListSchema>['query'];
