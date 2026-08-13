import type { ErrorRequestHandler, RequestHandler } from 'express';
import { logger } from '../config/logger.js';
export const notFoundHandler: RequestHandler = (_request, _response, next) =>
  next(Object.assign(new Error('The requested resource was not found.'), { statusCode: 404 }));
export const errorHandler: ErrorRequestHandler = (
  error: Error & { statusCode?: number; details?: unknown },
  request,
  response,
  _next,
) => {
  (request.log ?? logger).error({ error }, 'Request failed');
  response.status(error.statusCode ?? 500).json({
    success: false,
    message:
      error.statusCode && error.statusCode < 500
        ? error.message
        : 'An unexpected server error occurred.',
    data: null,
    timestamp: new Date().toISOString(),
    errors: error.details,
  });
};
