import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid record identifier is required.');

export const createRegistrationSchema = z.object({
  body: z.object({
    studentId: objectId,
    courseId: objectId,
    registrationNumber: z.string().trim().toUpperCase().min(2).max(40),
  }),
});

export const updateRegistrationSchema = z.object({
  params: z.object({
    registrationId: objectId,
  }),
  body: z.object({
    status: z.enum(['approved', 'withdrawn']),
  }),
});

export const borrowedCourseIdentifierSchema = z.object({
  params: z.object({ registrationId: objectId }).strict(),
});

export const borrowedCourseRequestSchema = z.object({
  body: z
    .object({
      courseId: objectId,
      reason: z.string().trim().min(20).max(500),
    })
    .strict(),
});

export const borrowedCourseUpdateSchema = z.object({
  params: z.object({ registrationId: objectId }).strict(),
  body: z.object({ reason: z.string().trim().min(20).max(500) }).strict(),
});

export const borrowedCourseReviewSchema = z.object({
  params: z.object({ registrationId: objectId }).strict(),
  body: z
    .object({
      decision: z.enum(['approve', 'reject']),
      note: z.string().trim().min(10).max(500),
    })
    .strict(),
});

export const borrowedCourseResubmitSchema = z.object({
  params: z.object({ registrationId: objectId }).strict(),
  body: z.object({ reason: z.string().trim().min(20).max(500).optional() }).strict(),
});

export const electiveCourseSelectionSchema = z.object({
  body: z.object({ courseId: objectId }).strict(),
});

export const electiveRegistrationIdentifierSchema = z.object({
  params: z.object({ registrationId: objectId }).strict(),
});
