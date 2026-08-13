import { z } from 'zod';
import { INSTITUTION_TYPES } from '@qr/shared';

const colourSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/);
const terminologyOverridesSchema = z
  .object({
    institution: z.string().trim().min(1).max(80).optional(),
    institutionPlural: z.string().trim().min(1).max(80).optional(),
    primaryUnit: z.string().trim().min(1).max(80).optional(),
    primaryUnitPlural: z.string().trim().min(1).max(80).optional(),
    department: z.string().trim().min(1).max(80).optional(),
    departmentPlural: z.string().trim().min(1).max(80).optional(),
    programme: z.string().trim().min(1).max(80).optional(),
    programmePlural: z.string().trim().min(1).max(80).optional(),
    course: z.string().trim().min(1).max(80).optional(),
    coursePlural: z.string().trim().min(1).max(80).optional(),
    educator: z.string().trim().min(1).max(80).optional(),
    educatorPlural: z.string().trim().min(1).max(80).optional(),
    student: z.string().trim().min(1).max(80).optional(),
    studentPlural: z.string().trim().min(1).max(80).optional(),
    academicPeriod: z.string().trim().min(1).max(80).optional(),
    academicPeriodPlural: z.string().trim().min(1).max(80).optional(),
  })
  .default({});

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function validIdentifierPattern(value: string): boolean {
  try {
    new RegExp(value, 'i');
    return true;
  } catch {
    return false;
  }
}

export const updateSettingsSchema = z.object({
  body: z.object({
    institutionName: z.string().trim().min(2).max(160).optional(),
    institutionType: z.enum(INSTITUTION_TYPES).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .optional(),
    countryName: z.string().trim().min(2).max(120).optional(),
    logoUrl: z.union([z.string().trim().url().max(2048), z.literal('')]).optional(),
    primaryColor: colourSchema.optional(),
    secondaryColor: colourSchema.optional(),
    terminologyPreset: z.enum([...INSTITUTION_TYPES, 'custom']).optional(),
    terminologyOverrides: terminologyOverridesSchema.optional(),
    staffTitlePreference: z.string().trim().min(2).max(80).optional(),
    studentIdentifierLabel: z.string().trim().min(2).max(80).optional(),
    studentIdentifierExample: z.string().trim().min(3).max(80).optional(),
    studentIdentifierPattern: z
      .string()
      .trim()
      .min(3)
      .max(200)
      .refine(validIdentifierPattern, 'Invalid student identifier pattern.')
      .optional(),
    studentIdentifierGuidance: z.string().trim().min(3).max(240).optional(),
    timeZone: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine(validTimeZone, 'Invalid IANA time zone.')
      .optional(),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
    attendanceRequirement: z.number().min(0).max(100),
    qrRotationSeconds: z.number().int().min(30).max(120),
    gpsRadiusMetres: z.number().int().min(10).max(1000),
    lateArrivalMinutes: z.number().int().min(0).max(120),
    brandingName: z.string().trim().min(2).max(160).optional(),
    academicSession: z
      .string()
      .trim()
      .regex(/^\d{4}\/\d{4}$/),
    currentSemester: z.string().trim().min(2).max(80),
    electiveRegistrationRequiresApproval: z.boolean().optional(),
    reminderPolicy: z
      .object({
        allowedChannels: z.object({
          in_app: z.boolean(),
          email: z.boolean(),
          push: z.boolean(),
          sms: z.boolean(),
        }),
        maximumWindowMinutes: z.number().int().min(5).max(10080),
      })
      .optional(),
  }),
});

export const updateInstitutionBrandingSchema = z.object({
  body: z
    .object({
      logoAssetId: z
        .string()
        .regex(/^[a-f\d]{24}$/i)
        .nullable(),
      logoUrl: z.string().trim().url().max(2048).optional(),
    })
    .superRefine((value, context) => {
      if (value.logoAssetId && !value.logoUrl)
        context.addIssue({
          code: 'custom',
          path: ['logoUrl'],
          message: 'The uploaded logo URL is required.',
        });
      if (!value.logoAssetId && value.logoUrl)
        context.addIssue({
          code: 'custom',
          path: ['logoUrl'],
          message: 'A logo URL must be paired with its secure asset.',
        });
    }),
});

export type UpdateInstitutionBrandingInput = z.infer<
  typeof updateInstitutionBrandingSchema
>['body'];

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body'];
