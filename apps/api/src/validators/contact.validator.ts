import { z } from 'zod';

export const contactInquirySchema = z.object({
  body: z
    .object({
      universityName: z.string().trim().min(2).max(160),
      contactName: z.string().trim().min(2).max(120),
      email: z.email().max(254),
      phone: z.string().trim().max(30).optional(),
      message: z.string().trim().min(20).max(2000),
      website: z.string().max(0).optional(),
    })
    .strict(),
});
