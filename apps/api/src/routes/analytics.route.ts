import { Router } from 'express';
import {
  generateAnalyticsReport,
  exportAnalyticsReport,
  getAnalyticsOverview,
  getMyAttendanceRisks,
} from '../controllers/analytics.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  analyticsOverviewQuerySchema,
  analyticsReportQuerySchema,
} from '../validators/analytics.validator.js';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);
analyticsRouter.get(
  '/overview',
  authorize('analytics:read'),
  validate(analyticsOverviewQuerySchema),
  getAnalyticsOverview,
);
analyticsRouter.get(
  '/my-risk',
  authorize('attendance:read', 'reports:read'),
  validate(analyticsOverviewQuerySchema),
  getMyAttendanceRisks,
);
analyticsRouter.get(
  '/reports/export',
  authorize('reports:read'),
  validate(analyticsReportQuerySchema),
  exportAnalyticsReport,
);
analyticsRouter.get(
  '/reports',
  authorize('reports:read'),
  validate(analyticsReportQuerySchema),
  generateAnalyticsReport,
);
