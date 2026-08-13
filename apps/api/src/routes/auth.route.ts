import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword,
  acceptInvitation,
  forgotPassword,
  listSessions,
  login,
  inspectInvitation,
  logout,
  logoutAll,
  refresh,
  register,
  resendVerification,
  revokeSession,
  resetPassword,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  changePasswordSchema,
  emailRequestSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sessionSchema,
  tokenSchema,
} from '../validators/auth.validator.js';
import {
  acceptInvitationSchema,
  invitationTokenSchema,
} from '../validators/invitation.validator.js';
import { requireTrustedOrigin } from '../middlewares/request-security.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
export const authRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many session refresh requests.', data: null },
});
authRouter.post('/register', authLimiter, validate(registerSchema), register);
authRouter.get(
  '/invitations/:token',
  authLimiter,
  validate(invitationTokenSchema),
  inspectInvitation,
);
authRouter.post(
  '/invitations/accept',
  authLimiter,
  validate(acceptInvitationSchema),
  acceptInvitation,
);
authRouter.post('/login', authLimiter, validate(loginSchema), login);
authRouter.post('/verify-email', authLimiter, validate(tokenSchema), verifyEmail);
authRouter.post(
  '/resend-verification',
  authLimiter,
  validate(emailRequestSchema),
  resendVerification,
);
authRouter.post('/forgot-password', authLimiter, validate(emailRequestSchema), forgotPassword);
authRouter.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
authRouter.post('/refresh', sessionLimiter, requireTrustedOrigin, refresh);
authRouter.post('/logout', requireTrustedOrigin, logout);
authRouter.get('/sessions', authenticate, listSessions);
authRouter.delete('/sessions/:sessionId', authenticate, validate(sessionSchema), revokeSession);
authRouter.post('/logout-all', requireTrustedOrigin, authenticate, logoutAll);
authRouter.post(
  '/change-password',
  requireTrustedOrigin,
  authenticate,
  validate(changePasswordSchema),
  changePassword,
);
