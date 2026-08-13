import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid record identifier is required.');

export const createAttendanceSessionSchema = z.object({
  body: z
    .object({
      courseId: objectId,
      durationMinutes: z.number().int().min(5).max(180).default(15),
      qrMode: z.enum(['static', 'rotating']).default('rotating'),
      qrRotationSeconds: z.number().int().min(30).max(120).default(60),
      gpsRequired: z.boolean().default(false),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      maximumRadiusMetres: z.number().int().min(10).max(1000).default(50),
      faceVerificationRequired: z.boolean().default(false),
    })
    .refine((value) => !value.gpsRequired || (value.latitude != null && value.longitude != null), {
      message: 'A venue location is required when GPS verification is enabled.',
    }),
});

export const closeAttendanceSessionSchema = z.object({
  params: z.object({ sessionId: objectId }),
});

const imageCapture = z
  .string()
  .max(950_000)
  .regex(/^data:image\/(?:jpeg|png|webp);base64,/i, 'A valid camera capture is required.');

const credentialShape = {
  code: z.string().trim().toUpperCase().min(8).max(32).optional(),
  token: z.string().trim().min(80).max(2048).optional(),
};
const attendanceCredential = z
  .object(credentialShape)
  .strict()
  .refine((value) => Boolean(value.code || value.token), {
    message: 'A QR token or check-in code is required.',
  });

export const attendanceRequirementsSchema = z.object({ body: attendanceCredential });

export const attendanceCheckInSchema = z.object({
  body: z
    .object({
      ...credentialShape,
      gps: z
        .object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          accuracy: z.number().min(0).max(500),
        })
        .optional(),
      imageCapture: imageCapture.optional(),
    })
    .strict()
    .refine((value) => Boolean(value.code || value.token), {
      message: 'A QR token or check-in code is required.',
    }),
});

export const faceEnrolmentSchema = z.object({
  body: z.object({ imageCapture }),
});

export const clearanceLookupSchema = z.object({
  params: z.object({
    registrationNumber: z.string().trim().min(2).max(40),
  }),
});
