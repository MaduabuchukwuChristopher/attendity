import type { RequestHandler } from 'express';
import { auditService } from '../services/audit.service.js';
import { auditListSchema } from '../validators/audit.validator.js';

export const listAuditLogs: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    const input = auditListSchema.parse({ query: request.query }).query;
    response.json({
      success: true,
      message: 'Audit records retrieved.',
      data: await auditService.list(request.actor, input),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
