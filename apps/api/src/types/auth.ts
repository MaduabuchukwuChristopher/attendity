import type { UserRole } from '@qr/types';

export interface AccessTokenClaims {
  readonly sub: string;
  readonly universityId: string;
  readonly role: UserRole;
  readonly type: 'access';
}

export interface RefreshTokenClaims {
  readonly sub: string;
  readonly sessionId: string;
  readonly type: 'refresh';
}
