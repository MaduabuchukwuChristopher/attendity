import { z } from 'zod';

export const updateEventNotificationPreferenceSchema = z.object({
  body: z
    .object({
      enabled: z.boolean(),
      channels: z
        .array(z.enum(['in_app', 'email', 'push', 'sms']))
        .min(1)
        .max(4),
      informationalEnabled: z.boolean(),
      operationalEnabled: z.boolean(),
      postEventEnabled: z.boolean(),
      reportAvailabilityEnabled: z.boolean(),
    })
    .refine((value) => value.channels.includes('in_app'), {
      path: ['channels'],
      message: 'In-app delivery is required for security and mandatory notices.',
    }),
});
export type UpdateEventNotificationPreferenceInput = z.infer<
  typeof updateEventNotificationPreferenceSchema
>['body'];
