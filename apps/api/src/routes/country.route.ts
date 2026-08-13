import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { environment } from '../config/environment.js';
import { getCountryPersonalization } from '../controllers/country.controller.js';

export const countryRouter = Router();

countryRouter.get(
  '/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: environment.IP_COUNTRY_RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Country personalization is temporarily unavailable.',
      data: null,
    },
  }),
  getCountryPersonalization,
);
