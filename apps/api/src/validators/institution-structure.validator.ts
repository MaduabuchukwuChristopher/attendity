import { INSTITUTION_STRUCTURE_KINDS } from '../models/institution-structure.model.js';
import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const plainText = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine((value) => !/[<>]/.test(value), 'Use plain text without HTML markup.');
const optionalDate = z.iso.datetime({ offset: true }).optional();

const structureFields = z.object({
  kind: z.enum(INSTITUTION_STRUCTURE_KINDS),
  code: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, 'Use letters, numbers, dots, slashes, or hyphens.'),
  name: plainText(2, 180),
  description: plainText(2, 1000).optional(),
  parentId: objectId.optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
  isCurrent: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
});

function validDateRange(
  value: {
    readonly startsAt?: string | undefined;
    readonly endsAt?: string | undefined;
  },
  context: z.RefinementCtx,
) {
  if (value.startsAt && value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt))
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'The end date must be later than the start date.',
    });
}

export const createInstitutionStructureSchema = z.object({
  body: structureFields.superRefine(validDateRange),
});
export const updateInstitutionStructureSchema = z.object({
  params: z.object({ structureId: objectId }),
  body: structureFields
    .omit({ kind: true })
    .partial()
    .superRefine(validDateRange)
    .refine((value) => Object.keys(value).length > 0, 'Provide a field to update.'),
});
export const institutionStructureIdentifierSchema = z.object({
  params: z.object({ structureId: objectId }),
});
export const institutionStructureListSchema = z.object({
  query: z.object({
    kind: z.enum([...INSTITUTION_STRUCTURE_KINDS, 'all']).default('all'),
    status: z.enum(['active', 'inactive', 'all']).default('active'),
    search: z.string().trim().max(100).default(''),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(25),
  }),
});

export type CreateInstitutionStructureInput = z.infer<
  typeof createInstitutionStructureSchema
>['body'];
export type UpdateInstitutionStructureInput = z.infer<
  typeof updateInstitutionStructureSchema
>['body'];
export type InstitutionStructureListInput = z.infer<typeof institutionStructureListSchema>['query'];
