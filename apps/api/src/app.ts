import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { environment } from './config/environment.js';
import { healthRouter } from './routes/health.route.js';
import { authRouter } from './routes/auth.route.js';
import { portalRouter } from './routes/portal.route.js';
import { academicRouter } from './routes/academic.route.js';
import { userRouter } from './routes/user.route.js';
import { registrationRouter } from './routes/registration.route.js';
import { attendanceRouter } from './routes/attendance.route.js';
import { settingsRouter } from './routes/settings.route.js';
import { analyticsRouter } from './routes/analytics.route.js';
import { notificationRouter } from './routes/notification.route.js';
import { clearanceRouter } from './routes/clearance.route.js';
import { contactRouter } from './routes/contact.route.js';
import { countryRouter } from './routes/country.route.js';
import { announcementRouter } from './routes/announcement.route.js';
import { eventRouter } from './routes/event.route.js';
import { mediaUploadRouter } from './routes/media-upload.route.js';
import { auditRouter } from './routes/audit.route.js';
import { profileRouter } from './routes/profile.route.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import rateLimit from 'express-rate-limit';
import { docsRouter } from './routes/docs.route.js';
import {
  assignRequestId,
  enforceHttps,
  preventSensitiveCaching,
  rejectUnsafeInput,
} from './middlewares/request-security.middleware.js';

export const app = express();
const allowedOrigins = environment.CORS_ORIGIN.split(',').map((value) => value.trim());
app.disable('x-powered-by');
app.set('trust proxy', environment.TRUST_PROXY ? 1 : false);
app.use(assignRequestId);
app.use(enforceHttps);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(cookieParser());
app.use(
  pinoHttp({
    serializers: {
      req: (request) => ({
        id: request.id,
        method: request.method,
        url: request.url,
      }),
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.image',
      ],
      censor: '[REDACTED]',
    },
    genReqId: (_request, response) => String(response.getHeader('x-request-id')),
  }),
);
app.use(rejectUnsafeInput);
app.use(docsRouter);
app.use(preventSensitiveCaching);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (request) => request.path.includes('/health'),
    message: { success: false, message: 'Too many requests. Please try again later.', data: null },
  }),
);
app.use(healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/contact', contactRouter);
app.use('/api/v1/country', countryRouter);
app.use('/api/v1/portal', portalRouter);
app.use('/api/v1/academic', academicRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/registrations', registrationRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/announcements', announcementRouter);
app.use('/api/v1/events', eventRouter);
app.use('/api/v1/uploads', mediaUploadRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/profiles', profileRouter);
app.use('/api/v1/clearance', clearanceRouter);
app.use(notFoundHandler);
app.use(errorHandler);
