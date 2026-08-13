import { z } from 'zod';
export const departmentSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2).max(16),
    name: z.string().trim().min(2).max(160),
    facultyName: z.string().trim().min(2).max(160),
  }),
});
export const courseSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2).max(24),
    title: z.string().trim().min(2).max(200),
    creditUnits: z.number().int().min(1).max(12),
    departmentId: z.string().regex(/^[a-f\d]{24}$/i),
    lecturerId: z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .optional(),
    attendanceRequirement: z.number().min(0).max(100).default(75),
  }),
});
export const courseLecturerSchema = z.object({
  params: z.object({
    courseId: z.string().regex(/^[a-f\d]{24}$/i),
  }),
  body: z.object({
    lecturerId: z.string().regex(/^[a-f\d]{24}$/i),
  }),
});
