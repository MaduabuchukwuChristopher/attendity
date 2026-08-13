import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  downloadCsv,
  downloadExcel,
  downloadPdf,
  examinerSearch,
  generateClearance,
  getClearanceReport,
  getEligibility,
  listClearanceArchive,
  printClearance,
  revokeClearance,
  shareClearance,
  verifyClearanceReport,
} from '../controllers/clearance.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  clearanceArchiveQuerySchema,
  clearanceExaminerQuerySchema,
  clearanceReportParamSchema,
  clearanceVerificationParamSchema,
  generateClearanceSchema,
  revokeClearanceSchema,
} from '../validators/clearance.validator.js';

export const clearanceRouter = Router();
const verificationLimiter = rateLimit({
  windowMs: 60_000,
  limit: 40,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts. Please wait before trying again.',
    data: null,
  },
});

clearanceRouter.get(
  '/verification/:reference',
  verificationLimiter,
  validate(clearanceVerificationParamSchema),
  verifyClearanceReport,
);
clearanceRouter.use(authenticate);
clearanceRouter.get('/eligibility', authorize('reports:read'), getEligibility);
clearanceRouter.get(
  '/examiner/search',
  authorize('clearance:verify'),
  validate(clearanceExaminerQuerySchema),
  examinerSearch,
);
clearanceRouter.post(
  '/reports',
  authorize('reports:read'),
  validate(generateClearanceSchema),
  generateClearance,
);
clearanceRouter.get(
  '/reports',
  authorize('reports:read'),
  validate(clearanceArchiveQuerySchema),
  listClearanceArchive,
);
clearanceRouter.get(
  '/reports/:reportId',
  authorize('reports:read'),
  validate(clearanceReportParamSchema),
  getClearanceReport,
);
clearanceRouter.get(
  '/reports/:reportId/pdf',
  authorize('reports:read'),
  validate(clearanceReportParamSchema),
  downloadPdf,
);
clearanceRouter.get(
  '/reports/:reportId/xlsx',
  authorize('reports:read'),
  validate(clearanceReportParamSchema),
  downloadExcel,
);
clearanceRouter.get(
  '/reports/:reportId/csv',
  authorize('reports:read'),
  validate(clearanceReportParamSchema),
  downloadCsv,
);
clearanceRouter.get(
  '/reports/:reportId/print',
  authorize('reports:read'),
  validate(clearanceReportParamSchema),
  printClearance,
);
clearanceRouter.patch(
  '/reports/:reportId/revoke',
  authorize('reports:write'),
  validate(revokeClearanceSchema),
  revokeClearance,
);
clearanceRouter.post(
  '/reports/:reportId/share',
  authorize('reports:read'),
  validate(clearanceReportParamSchema),
  shareClearance,
);
