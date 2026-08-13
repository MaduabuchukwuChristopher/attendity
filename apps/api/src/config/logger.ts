import pino from 'pino';
import { environment } from './environment.js';

export const logger = pino({
  name: 'attendity-api',
  level: environment.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: ['*.authorization', '*.cookie', '*.imageCapture'],
});
