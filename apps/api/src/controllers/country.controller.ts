import type { RequestHandler } from 'express';
import { countryService } from '../services/country.service.js';

export const getCountryPersonalization: RequestHandler = async (request, response, next) => {
  try {
    const edgeCountryCode =
      request.get('cf-ipcountry') ??
      request.get('x-vercel-ip-country') ??
      request.get('x-country-code');
    const data = await countryService.resolve({
      ...(edgeCountryCode ? { edgeCountryCode } : {}),
      ...(request.ip ? { ipAddress: request.ip } : {}),
    });
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.json({
      success: true,
      message:
        data.source === 'fallback' ? 'Generic country copy selected.' : 'Country copy resolved.',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
