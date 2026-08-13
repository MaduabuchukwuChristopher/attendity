import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getUploadConfiguration,
  uploadMedia,
  uploadInstitutionLogo,
  uploadProfilePhoto,
} from '../controllers/media-upload.controller.js';
import { authenticate, authorizeAny } from '../middlewares/auth.middleware.js';

export const mediaUploadRouter = Router();
const uploadLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many upload attempts. Please retry later.',
    data: null,
  },
});
const binaryImages = express.raw({ type: 'image/*', limit: '10mb' });

mediaUploadRouter.post('/profile', authenticate, uploadLimit, binaryImages, uploadProfilePhoto);
mediaUploadRouter.post(
  '/institution-logo',
  authenticate,
  authorizeAny('settings:write'),
  uploadLimit,
  binaryImages,
  uploadInstitutionLogo,
);
mediaUploadRouter.use(authenticate, authorizeAny('announcements:write', 'events:write'));
mediaUploadRouter.get('/configuration', getUploadConfiguration);
mediaUploadRouter.post(
  '/',
  uploadLimit,
  express.raw({
    type: [
      'application/pdf',
      'image/*',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.*',
    ],
    limit: '10mb',
  }),
  uploadMedia,
);
