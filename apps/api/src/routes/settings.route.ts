import { Router } from 'express';
import {
  getSettings,
  updateInstitutionBranding,
  updateSettings,
} from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  updateInstitutionBrandingSchema,
  updateSettingsSchema,
} from '../validators/settings.validator.js';
export const settingsRouter = Router();
settingsRouter.get('/institution', authenticate, getSettings);
settingsRouter.get('/', authenticate, authorize('settings:read'), getSettings);
settingsRouter.put(
  '/',
  authenticate,
  authorize('settings:write'),
  validate(updateSettingsSchema),
  updateSettings,
);
settingsRouter.put(
  '/branding',
  authenticate,
  authorize('settings:write'),
  validate(updateInstitutionBrandingSchema),
  updateInstitutionBranding,
);
