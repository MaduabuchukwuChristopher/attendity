import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  params: z.object({
    userId: z.string().regex(/^[a-f\d]{24}$/i),
  }),
  body: z.object({
    status: z.enum(['active', 'locked', 'suspended']),
  }),
});

export const updateUserScopeSchema = z.object({
  params: z.object({
    userId: z.string().regex(/^[a-f\d]{24}$/i),
  }),
  body: z.object({
    campus: z.string().trim().min(1).max(160).optional(),
    facultyName: z.string().trim().min(1).max(160).optional(),
    departmentId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    programme: z.string().trim().min(1).max(160).optional(),
    level: z.string().trim().min(1).max(40).optional(),
  }),
});
