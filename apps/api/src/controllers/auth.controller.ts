import type { RequestHandler } from 'express';
import { environment } from '../config/environment.js';
import { authService } from '../services/auth.service.js';
import { invitationService } from '../services/invitation.service.js';
export const refreshCookieOptions = (persistent = false) => ({
  httpOnly: true,
  secure: environment.NODE_ENV === 'production',
  sameSite: environment.NODE_ENV === 'production' ? ('none' as const) : ('strict' as const),
  path: '/api/v1/auth',
  ...(environment.NODE_ENV === 'production' && environment.COOKIE_DOMAIN
    ? { domain: environment.COOKIE_DOMAIN }
    : {}),
  ...(persistent ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
});
const client = (request: Parameters<RequestHandler>[0]) => ({
  ipAddress: request.ip,
  userAgent: request.get('user-agent'),
});
export const register: RequestHandler = async (request, response, next) => {
  try {
    const user = await authService.register(request.body);
    response.status(201).json({
      success: true,
      message: 'Account registered. Verify your email before signing in.',
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const demoRegister: RequestHandler = async (request, response, next) => {
  try {
    const user = await authService.registerDemo(request.body);
    response.status(201).json({
      success: true,
      message: 'Assessment account registered. Verify your email before signing in.',
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const inspectInvitation: RequestHandler = async (request, response, next) => {
  try {
    const token = request.params.token;
    if (typeof token !== 'string')
      throw Object.assign(new Error('Invitation was not found.'), { statusCode: 404 });
    response.json({
      success: true,
      message: 'Invitation retrieved.',
      data: await invitationService.inspect(token),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const acceptInvitation: RequestHandler = async (request, response, next) => {
  try {
    await invitationService.accept(request.body);
    response.status(201).json({
      success: true,
      message: 'Invitation accepted. You can now sign in.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const login: RequestHandler = async (request, response, next) => {
  try {
    const { user, tokens } = await authService.login({ ...request.body, ...client(request) });
    response
      .cookie(
        environment.REFRESH_COOKIE_NAME,
        tokens.refreshToken,
        refreshCookieOptions(request.body.rememberMe),
      )
      .status(200)
      .json({
        success: true,
        message: 'Signed in successfully.',
        data: { user, accessToken: tokens.accessToken },
        timestamp: new Date().toISOString(),
      });
  } catch (error) {
    next(error);
  }
};
export const refresh: RequestHandler = async (request, response, next) => {
  try {
    const token = request.cookies[environment.REFRESH_COOKIE_NAME] as unknown;
    if (typeof token !== 'string')
      throw Object.assign(new Error('Refresh token is required.'), { statusCode: 401 });
    const { user, tokens, persistent } = await authService.refresh(
      token,
      ...Object.values(client(request)),
    );
    response
      .cookie(
        environment.REFRESH_COOKIE_NAME,
        tokens.refreshToken,
        refreshCookieOptions(persistent),
      )
      .json({
        success: true,
        message: 'Session refreshed.',
        data: { user, accessToken: tokens.accessToken },
        timestamp: new Date().toISOString(),
      });
  } catch (error) {
    next(error);
  }
};
export const logout: RequestHandler = async (request, response, next) => {
  try {
    const token = request.cookies[environment.REFRESH_COOKIE_NAME] as unknown;
    if (typeof token === 'string') await authService.revoke(token);
    response
      .clearCookie(environment.REFRESH_COOKIE_NAME, refreshCookieOptions())
      .status(204)
      .send();
  } catch (error) {
    next(error);
  }
};
export const verifyEmail: RequestHandler = async (request, response, next) => {
  try {
    await authService.verifyEmail(request.body.token);
    response.json({
      success: true,
      message: 'Email verified. You can now sign in.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const resendVerification: RequestHandler = async (request, response, next) => {
  try {
    await authService.resendVerification(request.body.universityId, request.body.email);
    response.status(202).json({
      success: true,
      message: 'If the account is awaiting verification, a new email has been sent.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const forgotPassword: RequestHandler = async (request, response, next) => {
  try {
    await authService.requestPasswordReset(request.body.universityId, request.body.email);
    response.status(202).json({
      success: true,
      message: 'If the account exists, password reset instructions have been sent.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const resetPassword: RequestHandler = async (request, response, next) => {
  try {
    await authService.resetPassword(request.body.token, request.body.password);
    response.json({
      success: true,
      message: 'Password reset. Sign in with your new password.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const listSessions: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    response.json({
      success: true,
      message: 'Active sessions retrieved.',
      data: await authService.sessions(request.actor.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
export const logoutAll: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    await authService.revokeAll(request.actor.id);
    response
      .clearCookie(environment.REFRESH_COOKIE_NAME, refreshCookieOptions())
      .status(204)
      .send();
  } catch (error) {
    next(error);
  }
};
export const revokeSession: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    const sessionId = request.params.sessionId;
    if (typeof sessionId !== 'string')
      throw Object.assign(new Error('Session was not found.'), { statusCode: 404 });
    const revoked = await authService.revokeSession(request.actor.id, sessionId);
    if (!revoked) throw Object.assign(new Error('Session was not found.'), { statusCode: 404 });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};
export const changePassword: RequestHandler = async (request, response, next) => {
  try {
    if (!request.actor)
      throw Object.assign(new Error('Authentication is required.'), { statusCode: 401 });
    await authService.changePassword(
      request.actor.id,
      request.body.currentPassword,
      request.body.newPassword,
    );
    response.json({
      success: true,
      message: 'Password changed. Sign in again on each approved device.',
      data: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
