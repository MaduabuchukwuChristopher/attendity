import { ROLE_PERMISSIONS } from '@qr/shared';
import type { Permission, RequestActor, UserRole } from '@qr/types';
import jsonwebtoken from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { environment } from '../config/environment.js';

const { verify } = jsonwebtoken;

declare global {
  namespace Express {
    interface Request {
      actor?: RequestActor;
    }
  }
}
interface Claims {
  readonly sub: string;
  readonly universityId: string;
  readonly role: UserRole;
  readonly type: 'access';
}
export const authenticate: RequestHandler = (request, _response, next) => {
  const token = request.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token)
    return next(Object.assign(new Error('Authentication is required.'), { statusCode: 401 }));
  try {
    const claims = verify(token, environment.JWT_ACCESS_SECRET) as Claims;
    if (claims.type !== 'access') throw new Error();
    request.actor = {
      id: claims.sub,
      universityId: claims.universityId,
      role: claims.role,
      email: '',
      fullName: '',
      sessionId: '',
      permissions: ROLE_PERMISSIONS[claims.role],
    };
    return next();
  } catch {
    return next(
      Object.assign(new Error('Authentication token is invalid or expired.'), { statusCode: 401 }),
    );
  }
};
export function authorize(...permissions: readonly Permission[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.actor)
      return next(Object.assign(new Error('Authentication is required.'), { statusCode: 401 }));
    if (!permissions.every((permission) => request.actor!.permissions.includes(permission)))
      return next(
        Object.assign(new Error('You do not have permission to perform this action.'), {
          statusCode: 403,
        }),
      );
    return next();
  };
}

export function authorizeAny(...permissions: readonly Permission[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.actor)
      return next(Object.assign(new Error('Authentication is required.'), { statusCode: 401 }));
    if (!permissions.some((permission) => request.actor!.permissions.includes(permission)))
      return next(
        Object.assign(new Error('You do not have permission to perform this action.'), {
          statusCode: 403,
        }),
      );
    return next();
  };
}
