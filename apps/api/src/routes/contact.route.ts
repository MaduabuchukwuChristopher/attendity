import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { submitContactInquiry } from '../controllers/contact.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { contactInquirySchema } from '../validators/contact.validator.js';

export const contactRouter = Router();
contactRouter.post(
  '/',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.', data: null },
  }),
  validate(contactInquirySchema),
  submitContactInquiry,
);
