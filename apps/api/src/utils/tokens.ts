import jsonwebtoken, { type SignOptions } from 'jsonwebtoken';
import { environment } from '../config/environment.js';
import type { AccessTokenClaims, RefreshTokenClaims } from '../types/auth.js';

type TokenLifetime = NonNullable<SignOptions['expiresIn']>;
const { sign } = jsonwebtoken;

export function signAccessToken(claims: Omit<AccessTokenClaims, 'type'>): string {
  return sign({ ...claims, type: 'access' }, environment.JWT_ACCESS_SECRET, {
    expiresIn: environment.JWT_ACCESS_TTL as TokenLifetime,
  });
}

export function signRefreshToken(claims: Omit<RefreshTokenClaims, 'type'>): string {
  return sign({ ...claims, type: 'refresh' }, environment.JWT_REFRESH_SECRET, {
    expiresIn: environment.JWT_REFRESH_TTL as TokenLifetime,
  });
}
