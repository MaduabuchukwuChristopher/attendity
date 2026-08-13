import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 -]{7,22}$/, 'Enter a valid phone number.');
const photoUrl = z.string().trim().url().max(2048).optional();
const photoAssetId = objectId.optional();

function hasCompletePhotoReference(value: {
  photoUrl?: string | undefined;
  photoAssetId?: string | undefined;
}): boolean {
  return Boolean(value.photoUrl) === Boolean(value.photoAssetId);
}

export const updateStudentProfileSchema = z.object({
  body: z
    .object({
      matricNumber: z.string().trim().min(3).max(40),
      phone,
      photoUrl,
      photoAssetId,
      campusId: objectId,
      facultyId: objectId,
      departmentId: objectId,
      programmeId: objectId,
      levelId: objectId,
      admissionSessionId: objectId,
    })
    .strict()
    .refine(hasCompletePhotoReference, {
      message: 'Profile photographs must use a secure uploaded asset.',
      path: ['photoAssetId'],
    }),
});

export const updateLecturerProfileSchema = z.object({
  body: z
    .object({
      employeeNumber: z.string().trim().min(3).max(40),
      title: z.string().trim().min(2).max(80).optional(),
      phone,
      photoUrl,
      photoAssetId,
      campusId: objectId.optional(),
      facultyId: objectId.optional(),
      departmentId: objectId.optional(),
      office: z.string().trim().min(2).max(160).optional(),
      biography: z.string().trim().min(20).max(1000).optional(),
    })
    .strict()
    .refine(hasCompletePhotoReference, {
      message: 'Profile photographs must use a secure uploaded asset.',
      path: ['photoAssetId'],
    }),
});

export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>['body'];
export type UpdateLecturerProfileInput = z.infer<typeof updateLecturerProfileSchema>['body'];
