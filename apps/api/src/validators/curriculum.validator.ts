import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid record identifier is required.');
const classification = z.enum(['core', 'elective']);

export const createCurriculumMappingSchema = z.object({
  body: z
    .object({
      courseId: objectId,
      programmeId: objectId,
      levelId: objectId,
      termId: objectId,
      classification,
    })
    .strict(),
});

export const curriculumMappingIdentifierSchema = z.object({
  params: z.object({ mappingId: objectId }).strict(),
});

export const updateCurriculumMappingSchema = z.object({
  params: z.object({ mappingId: objectId }).strict(),
  body: z.object({ classification }).strict(),
});

export type CreateCurriculumMappingInput = z.infer<typeof createCurriculumMappingSchema>['body'];
export type UpdateCurriculumMappingInput = z.infer<typeof updateCurriculumMappingSchema>['body'];

const lecturerAssignmentBody = z
  .object({
    lecturerId: objectId,
    courseId: objectId,
    academicSessionId: objectId,
    termId: objectId,
    assignmentRole: z.enum(['primary', 'co_lecturer']).default('primary'),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .strict()
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: 'Assignment end must be after its start.',
    path: ['endsAt'],
  });

export const createLecturerAssignmentSchema = z.object({ body: lecturerAssignmentBody });

export const lecturerAssignmentIdentifierSchema = z.object({
  params: z.object({ assignmentId: objectId }).strict(),
});

export type CreateLecturerAssignmentInput = z.infer<typeof createLecturerAssignmentSchema>['body'];
