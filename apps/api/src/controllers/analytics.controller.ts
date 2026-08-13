import type { RequestHandler } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { analyticsExportService } from '../services/analytics-export.service.js';
import { trustedMediaService } from '../services/trusted-media.service.js';
import {
  analyticsOverviewQuerySchema,
  analyticsReportQuerySchema,
} from '../validators/analytics.validator.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

export const getAnalyticsOverview: RequestHandler = async (request, response, next) => {
  try {
    const query = analyticsOverviewQuerySchema.parse({ query: request.query }).query;
    response.json({
      success: true,
      message: 'Attendance analytics retrieved.',
      data: await analyticsService.overview(actor(request), {
        ...(query.period ? { period: query.period } : {}),
        ...(query.days !== undefined ? { days: query.days } : {}),
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
      }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAttendanceRisks: RequestHandler = async (request, response, next) => {
  try {
    const { days = 365 } = analyticsOverviewQuerySchema.parse({ query: request.query }).query;
    response.json({
      success: true,
      message: 'Personal attendance risk retrieved.',
      data: await analyticsService.myRisks(actor(request), days),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const generateAnalyticsReport: RequestHandler = async (request, response, next) => {
  try {
    const query = analyticsReportQuerySchema.parse({ query: request.query }).query;
    const now = new Date();
    const from = query.from ?? new Date(now.getTime() - 29 * 86_400_000);
    from.setUTCHours(0, 0, 0, 0);
    const to = query.to ?? now;
    response.json({
      success: true,
      message: 'Live attendance report generated.',
      data: await analyticsService.report(actor(request), {
        scope: query.scope,
        ...(query.courseId ? { courseId: query.courseId } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
        from,
        to,
        page: query.page,
        limit: query.limit,
      }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const exportAnalyticsReport: RequestHandler = async (request, response, next) => {
  try {
    const currentActor = actor(request);
    const query = analyticsReportQuerySchema.parse({ query: request.query }).query;
    const now = new Date();
    const from = query.from ?? new Date(now.getTime() - 29 * 86_400_000);
    from.setUTCHours(0, 0, 0, 0);
    const to = query.to ?? now;
    const report = await analyticsService.report(currentActor, {
      scope: query.scope,
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      from,
      to,
      page: query.page,
      limit: query.limit,
    });
    const logo = await trustedMediaService.resolveImage({
      universityId: currentActor.universityId,
      ...(report.branding.logoAssetId ? { assetId: report.branding.logoAssetId } : {}),
      ...(report.branding.logoUrl ? { snapshotUrl: report.branding.logoUrl } : {}),
      contexts: ['institution_logo'],
    });
    const format = query.format ?? 'pdf';
    const buffer =
      format === 'xlsx'
        ? await analyticsExportService.excel(report, logo)
        : format === 'csv'
          ? analyticsExportService.csv(report)
          : await analyticsExportService.pdf(report, logo);
    const contentType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : format === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/pdf';
    response.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${report.reportId}.${format}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, no-store',
    });
    response.send(buffer);
  } catch (error) {
    next(error);
  }
};
