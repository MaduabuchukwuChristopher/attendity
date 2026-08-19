import { z } from 'zod';
import { ASSESSMENT_REGISTRATION_ROLES } from '@qr/shared';
export const securePasswordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);
export const registerSchema = z.object({
  body: z
    .object({
      universityId: z.string().trim().min(3).max(120),
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      email: z.email().max(254),
      password: securePasswordSchema,
    })
    .strict(),
});
export const demoRegisterSchema = z.object({
  body: z
    .object({
      universityId: z.literal('lagos-metropolitan-university'),
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      email: z.email().max(254),
      password: securePasswordSchema,
      role: z.enum(ASSESSMENT_REGISTRATION_ROLES),
    })
    .strict(),
});
export const loginSchema = z.object({
  body: z.object({
    universityId: z.string().trim().min(3).max(120),
    email: z.email().max(254),
    password: z.string().min(1).max(128),
    rememberMe: z.boolean().default(false),
  }),
});
export const emailRequestSchema = z.object({
  body: z.object({
    universityId: z.string().trim().min(3).max(120),
    email: z.email().max(254),
  }),
});
export const tokenSchema = z.object({
  body: z.object({ token: z.string().min(32).max(256) }),
});
export const resetPasswordSchema = z.object({
  body: z.object({ token: z.string().min(32).max(256), password: securePasswordSchema }),
});
export const sessionSchema = z.object({
  params: z.object({ sessionId: z.uuid() }),
});
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: securePasswordSchema,
  }),
});
