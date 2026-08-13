import { Router } from 'express';
import { listAuditLogs } from '../controllers/audit.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { auditListSchema } from '../validators/audit.validator.js';

export const auditRouter = Router();
auditRouter.get(
  '/',
  authenticate,
  authorize('audit:read'),
  validate(auditListSchema),
  listAuditLogs,
);
