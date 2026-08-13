import type { RequestHandler } from 'express';
import { clearanceExportService } from '../services/clearance-export.service.js';
import { clearanceService } from '../services/clearance.service.js';
import {
  clearanceArchiveQuerySchema,
  clearanceExaminerQuerySchema,
} from '../validators/clearance.validator.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

function parameter(value: string | string[] | undefined): string {
  if (typeof value !== 'string')
    throw Object.assign(new Error('Clearance report was not found.'), { statusCode: 404 });
  return value;
}

function requestMetadata(request: Parameters<RequestHandler>[0]) {
  const ipAddress = request.ip;
  const userAgent = request.get('user-agent');
  return {
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

export const getEligibility: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Exam eligibility calculated from live attendance.',
      data: await clearanceService.eligibilityForStudent(actor(request)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const generateClearance: RequestHandler = async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Attendance clearance report generated.',
      data: await clearanceService.generate(actor(request), request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const listClearanceArchive: RequestHandler = async (request, response, next) => {
  try {
    const query = clearanceArchiveQuerySchema.parse({ query: request.query }).query;
    response.json({
      success: true,
      message: 'Clearance report archive retrieved.',
      data: await clearanceService.archive(actor(request), {
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? { search: query.search } : {}),
        page: query.page,
        limit: query.limit,
      }),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getClearanceReport: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Clearance report retrieved.',
      data: await clearanceService.get(actor(request), parameter(request.params.reportId)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const verifyClearanceReport: RequestHandler = async (request, response, next) => {
  try {
    const data = await clearanceService.verification(parameter(request.params.reference));
    response.status(data.status === 'not_found' ? 404 : 200).json({
      success: data.verified,
      message: data.verified
        ? 'Clearance report verified by the server.'
        : 'Clearance report is not valid.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const examinerSearch: RequestHandler = async (request, response, next) => {
  try {
    const { reference } = clearanceExaminerQuerySchema.parse({ query: request.query }).query;
    response.json({
      success: true,
      message: 'Clearance verification completed.',
      data: await clearanceService.examinerSearch(actor(request), reference),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

async function exportReport(
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1],
  format: 'pdf' | 'xlsx' | 'csv' | 'print',
): Promise<void> {
  const currentActor = actor(request);
  const report = await clearanceService.get(currentActor, parameter(request.params.reportId));
  const buffer =
    format === 'xlsx'
      ? await clearanceExportService.excel(report, { universityId: currentActor.universityId })
      : format === 'csv'
        ? clearanceExportService.csv(report)
        : await clearanceExportService.pdf(report, { universityId: currentActor.universityId });
  await clearanceService.recordExport(currentActor, report, format, requestMetadata(request));
  const extension = format === 'print' ? 'pdf' : format;
  const contentType =
    extension === 'pdf'
      ? 'application/pdf'
      : extension === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv; charset=utf-8';
  response.set({
    'Content-Type': contentType,
    'Content-Length': String(buffer.length),
    'Content-Disposition': `${format === 'print' ? 'inline' : 'attachment'}; filename="${report.reportId}.${extension}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.send(buffer);
}

export const downloadPdf: RequestHandler = async (request, response, next) => {
  try {
    await exportReport(request, response, 'pdf');
  } catch (error) {
    next(error);
  }
};
export const downloadExcel: RequestHandler = async (request, response, next) => {
  try {
    await exportReport(request, response, 'xlsx');
  } catch (error) {
    next(error);
  }
};
export const downloadCsv: RequestHandler = async (request, response, next) => {
  try {
    await exportReport(request, response, 'csv');
  } catch (error) {
    next(error);
  }
};
export const printClearance: RequestHandler = async (request, response, next) => {
  try {
    await exportReport(request, response, 'print');
  } catch (error) {
    next(error);
  }
};

export const revokeClearance: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Clearance report revoked.',
      data: await clearanceService.revoke(
        actor(request),
        parameter(request.params.reportId),
        request.body.reason,
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const shareClearance: RequestHandler = async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Clearance verification link prepared.',
      data: await clearanceService.share(
        actor(request),
        parameter(request.params.reportId),
        requestMetadata(request),
      ),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
