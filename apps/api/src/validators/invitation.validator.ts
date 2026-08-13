import { STAFF_INVITABLE_ROLES } from '@qr/shared';
import { z } from 'zod';
import { securePasswordSchema } from './auth.validator.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const invitationToken = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, 'A valid invitation token is required.');

export const createInvitationSchema = z.object({
  body: z
    .object({
      email: z.email().max(254),
      role: z.enum(STAFF_INVITABLE_ROLES),
      campus: z.string().trim().min(1).max(160).optional(),
      facultyName: z.string().trim().min(1).max(160).optional(),
      departmentId: objectId.optional(),
    })
    .strict(),
});

export const invitationIdentifierSchema = z.object({
  params: z.object({ invitationId: objectId }),
});

export const invitationTokenSchema = z.object({
  params: z.object({ token: invitationToken }),
});

export const acceptInvitationSchema = z.object({
  body: z
    .object({
      token: invitationToken,
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      password: securePasswordSchema,
    })
    .strict(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>['body'];
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>['body'];
