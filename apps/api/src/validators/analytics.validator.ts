import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid record identifier is required.');

export const analyticsOverviewQuerySchema = z.object({
  query: z
    .object({
      period: z.enum(['daily', 'weekly', 'monthly', 'semester', 'custom']).optional(),
      days: z.coerce.number().int().min(7).max(365).default(30),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .superRefine((value, context) => {
      if (value.period === 'custom' && (!value.from || !value.to))
        context.addIssue({
          code: 'custom',
          message: 'Custom analytics require both start and end dates.',
          path: ['from'],
        });
      if (value.from && value.to && value.from > value.to)
        context.addIssue({
          code: 'custom',
          message: 'The analytics start date must not be after the end date.',
          path: ['from'],
        });
      if (value.from && value.to && value.to.getTime() - value.from.getTime() > 366 * 86_400_000)
        context.addIssue({
          code: 'custom',
          message: 'Analytics ranges cannot exceed one year.',
          path: ['to'],
        });
    }),
});

export const analyticsReportQuerySchema = z.object({
  query: z
    .object({
      scope: z.enum(['university', 'course', 'student', 'risk']).default('university'),
      courseId: objectId.optional(),
      studentId: objectId.optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(10).max(100).default(25),
      format: z.enum(['pdf', 'xlsx', 'csv']).optional(),
    })
    .refine((value) => value.scope !== 'course' || Boolean(value.courseId), {
      message: 'A course is required for a course report.',
      path: ['courseId'],
    })
    .refine((value) => !value.from || !value.to || value.from <= value.to, {
      message: 'The report start date must not be after the end date.',
      path: ['from'],
    }),
});
