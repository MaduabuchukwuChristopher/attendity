import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const dateTime = z.iso.datetime({ offset: true });

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const scheduleFields = z.object({
  courseId: objectId,
  lecturerId: objectId.optional(),
  startsAt: dateTime,
  endsAt: dateTime,
  venue: z.string().trim().min(2).max(200),
  timeZone: z.string().trim().min(1).max(80).refine(validTimeZone, 'Invalid IANA time zone.'),
});

const scheduleBody = scheduleFields.superRefine((value, context) => {
  const startsAt = new Date(value.startsAt);
  const endsAt = new Date(value.endsAt);
  if (endsAt <= startsAt)
    context.addIssue({
      code: 'custom',
      message: 'Class end time must be after its start time.',
      path: ['endsAt'],
    });
  if (endsAt.getTime() - startsAt.getTime() > 12 * 60 * 60_000)
    context.addIssue({
      code: 'custom',
      message: 'A scheduled class cannot exceed 12 hours.',
      path: ['endsAt'],
    });
});

export const createScheduleSchema = z.object({ body: scheduleBody });
export const updateScheduleSchema = z.object({
  params: z.object({ scheduleId: objectId }),
  body: scheduleFields
    .omit({ courseId: true })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'Provide at least one schedule field to update.',
    }),
});
export const scheduleIdentifierSchema = z.object({
  params: z.object({ scheduleId: objectId }),
});
export const cancelScheduleSchema = z.object({
  params: z.object({ scheduleId: objectId }),
  body: z.object({ reason: z.string().trim().min(3).max(300) }),
});
export const scheduleListQuerySchema = z.object({
  query: z.object({
    status: z.enum(['scheduled', 'cancelled', 'completed', 'all']).default('scheduled'),
    from: dateTime.optional(),
    to: dateTime.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(20),
  }),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>['body'];
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>['body'];
