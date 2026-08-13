import type { RequestHandler } from 'express';
import { mediaUploadService } from '../services/media-upload.service.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

function send(
  response: Parameters<RequestHandler>[1],
  message: string,
  data: unknown,
  status = 200,
) {
  response
    .status(status)
    .json({ success: true, message, data, timestamp: new Date().toISOString() });
}

export const getUploadConfiguration: RequestHandler = (_request, response) => {
  send(response, 'Upload configuration retrieved.', mediaUploadService.configuration());
};

export const uploadMedia: RequestHandler = async (request, response, next) => {
  try {
    const name = request.get('x-file-name');
    const context = request.get('x-upload-context');
    const mimeType = request.get('content-type')?.split(';')[0];
    if (!name || !mimeType || !['announcement', 'event'].includes(context ?? ''))
      throw Object.assign(new Error('File name, context, and content type are required.'), {
        statusCode: 422,
      });
    if (!Buffer.isBuffer(request.body))
      throw Object.assign(new Error('A binary file body is required.'), { statusCode: 422 });
    send(
      response,
      'File uploaded securely.',
      await mediaUploadService.upload(actor(request), {
        context: context as 'announcement' | 'event',
        name: decodeURIComponent(name),
        mimeType,
        buffer: request.body,
      }),
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const uploadProfilePhoto: RequestHandler = async (request, response, next) => {
  try {
    const name = request.get('x-file-name');
    const mimeType = request.get('content-type')?.split(';')[0];
    if (!name || !mimeType)
      throw Object.assign(new Error('File name and content type are required.'), {
        statusCode: 422,
      });
    if (!Buffer.isBuffer(request.body))
      throw Object.assign(new Error('A binary image body is required.'), { statusCode: 422 });
    send(
      response,
      'Profile photograph uploaded securely.',
      await mediaUploadService.upload(actor(request), {
        context: 'profile',
        name: decodeURIComponent(name),
        mimeType,
        buffer: request.body,
      }),
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const uploadInstitutionLogo: RequestHandler = async (request, response, next) => {
  try {
    const name = request.get('x-file-name');
    const mimeType = request.get('content-type')?.split(';')[0];
    if (!name || !mimeType)
      throw Object.assign(new Error('File name and content type are required.'), {
        statusCode: 422,
      });
    if (!Buffer.isBuffer(request.body))
      throw Object.assign(new Error('A binary image body is required.'), { statusCode: 422 });
    send(
      response,
      'Institution logo uploaded securely.',
      await mediaUploadService.upload(actor(request), {
        context: 'institution_logo',
        name: decodeURIComponent(name),
        mimeType,
        buffer: request.body,
      }),
      201,
    );
  } catch (error) {
    next(error);
  }
};
