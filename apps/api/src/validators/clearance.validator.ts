import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid record identifier is required.');
const reportId = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^ACL-\d{8}-[A-F\d]{10}$/, 'A valid clearance report ID is required.');

export const generateClearanceSchema = z.object({
  body: z.object({ courseId: objectId, studentId: objectId.optional() }).strict(),
});

export const clearanceArchiveQuerySchema = z.object({
  query: z.object({
    status: z.enum(['valid', 'revoked', 'expired']).optional(),
    search: z.string().trim().max(80).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(20),
  }),
});

export const clearanceReportParamSchema = z.object({ params: z.object({ reportId }) });

export const clearanceVerificationParamSchema = z.object({
  params: z.object({ reference: z.string().trim().min(10).max(120) }),
});

export const clearanceExaminerQuerySchema = z.object({
  query: z.object({ reference: z.string().trim().min(2).max(120) }),
});

export const revokeClearanceSchema = z.object({
  params: z.object({ reportId }),
  body: z.object({ reason: z.string().trim().min(10).max(240) }).strict(),
});
