import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { environment } from '../config/environment.js';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function containsUnsafeKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsUnsafeKey);
  return Object.entries(value).some(
    ([key, child]) =>
      key.startsWith('$') ||
      key.includes('.') ||
      FORBIDDEN_KEYS.has(key) ||
      containsUnsafeKey(child),
  );
}

export const assignRequestId: RequestHandler = (request, response, next) => {
  const supplied = request.get('x-request-id');
  const requestId = supplied && /^[a-zA-Z0-9_-]{8,128}$/.test(supplied) ? supplied : randomUUID();
  response.setHeader('x-request-id', requestId);
  next();
};

export const rejectUnsafeInput: RequestHandler = (request, _response, next) => {
  if ([request.body, request.query, request.params].some(containsUnsafeKey)) {
    next(
      Object.assign(new Error('The request contains an unsupported field name.'), {
        statusCode: 400,
      }),
    );
    return;
  }
  next();
};

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin');
  const allowedOrigins = environment.CORS_ORIGIN.split(',').map((value) => value.trim());
  if (origin && allowedOrigins.includes(origin)) {
    next();
    return;
  }
  if (!origin && !request.cookies[environment.REFRESH_COOKIE_NAME]) {
    next();
    return;
  }
  next(Object.assign(new Error('The request origin is not trusted.'), { statusCode: 403 }));
};

export const enforceHttps: RequestHandler = (request, response, next) => {
  if (!environment.ENFORCE_HTTPS || request.secure || request.path.includes('/health')) {
    next();
    return;
  }
  response.status(426).json({
    success: false,
    message: 'A secure HTTPS connection is required.',
    data: null,
    timestamp: new Date().toISOString(),
  });
};

export const preventSensitiveCaching: RequestHandler = (_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  next();
};
