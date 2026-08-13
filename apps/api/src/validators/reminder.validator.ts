import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const channel = z.enum(['in_app', 'email', 'push', 'sms']);
const secureEndpoint = z
  .string()
  .url()
  .max(4096)
  .refine((value) => new URL(value).protocol === 'https:', 'A secure push endpoint is required.');

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const updateReminderPreferenceSchema = z.object({
  body: z
    .object({
      enabled: z.boolean(),
      defaultOffsetMinutes: z.number().int().min(5).max(10080),
      channels: z.array(channel).max(4),
      preferredTimeZone: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .refine(validTimeZone, 'Invalid IANA time zone.')
        .optional(),
      quietHours: z.object({
        enabled: z.boolean(),
        startMinute: z.number().int().min(0).max(1439),
        endMinute: z.number().int().min(0).max(1439),
      }),
      mutedCourseIds: z.array(objectId).max(100),
      overrides: z
        .array(
          z.object({
            scheduleId: objectId,
            enabled: z.boolean(),
            offsetMinutes: z.number().int().min(5).max(10080).optional(),
            channels: z.array(channel).max(4).optional(),
          }),
        )
        .max(100),
    })
    .superRefine((value, context) => {
      if (value.enabled && value.channels.length === 0)
        context.addIssue({
          code: 'custom',
          message: 'Select at least one reminder channel.',
          path: ['channels'],
        });
      if (value.quietHours.enabled && value.quietHours.startMinute === value.quietHours.endMinute)
        context.addIssue({
          code: 'custom',
          message: 'Quiet-hour start and end times must differ.',
          path: ['quietHours', 'endMinute'],
        });
    }),
});

export const reminderHistoryQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(20),
  }),
});

export const reminderChannelSchema = z.object({ params: z.object({ channel }) });

export const pushSubscriptionSchema = z.object({
  body: z.object({
    endpoint: secureEndpoint,
    expirationTime: z.number().nonnegative().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(16).max(512),
      auth: z.string().min(8).max(512),
    }),
  }),
});

export const pushSubscriptionIdentifierSchema = z.object({
  body: z.object({ endpoint: secureEndpoint }),
});

export type UpdateReminderPreferenceInput = z.infer<typeof updateReminderPreferenceSchema>['body'];
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>['body'];
