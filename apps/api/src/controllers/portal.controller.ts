import type { RequestHandler } from 'express';
import { portalService } from '../services/portal.service.js';
export const getSummary: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    const data = await portalService.summary(request.actor.universityId, request.actor.id);
    response.json({
      success: true,
      message: 'Portal summary retrieved.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
