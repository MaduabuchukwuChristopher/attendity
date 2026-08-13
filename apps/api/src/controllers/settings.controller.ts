import type { RequestHandler } from 'express';
import { settingsService } from '../services/settings.service.js';
export const getSettings: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    const data = await settingsService.get(request.actor);
    response.json({
      success: true,
      message: 'Settings retrieved.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const updateSettings: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    const data = await settingsService.update(request.actor, request.body);
    response.json({
      success: true,
      message: 'Settings updated.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateInstitutionBranding: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    response.json({
      success: true,
      message: 'Institution branding updated.',
      data: await settingsService.updateBranding(request.actor, request.body),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
