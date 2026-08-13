import type { RequestHandler } from 'express';
import { institutionStructureService } from '../services/institution-structure.service.js';
import { institutionStructureListSchema } from '../validators/institution-structure.validator.js';

function actor(request: Parameters<RequestHandler>[0]) {
  if (!request.actor)
    throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
  return request.actor;
}

function identifier(request: Parameters<RequestHandler>[0]): string {
  const value = request.params.structureId;
  if (typeof value !== 'string')
    throw Object.assign(new Error('Academic structure record was not found.'), { statusCode: 404 });
  return value;
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

export const listInstitutionStructure: RequestHandler = async (request, response, next) => {
  try {
    const input = institutionStructureListSchema.parse({ query: request.query }).query;
    send(
      response,
      'Academic structure retrieved.',
      await institutionStructureService.list(actor(request), input),
    );
  } catch (error) {
    next(error);
  }
};

export const createInstitutionStructure: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Academic structure record created.',
      await institutionStructureService.create(actor(request), request.body),
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const updateInstitutionStructure: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Academic structure record updated.',
      await institutionStructureService.update(actor(request), identifier(request), request.body),
    );
  } catch (error) {
    next(error);
  }
};

export const deactivateInstitutionStructure: RequestHandler = async (request, response, next) => {
  try {
    send(
      response,
      'Academic structure record deactivated.',
      await institutionStructureService.deactivate(actor(request), identifier(request)),
    );
  } catch (error) {
    next(error);
  }
};
