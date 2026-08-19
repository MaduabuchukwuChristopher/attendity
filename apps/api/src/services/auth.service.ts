import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { AuthenticatedUser, RequestActor, TokenPair, UserRole } from '@qr/types';
import { ASSESSMENT_REGISTRATION_ROLES, ROLE_PERMISSIONS } from '@qr/shared';
import { isValidObjectId } from 'mongoose';
import { environment } from '../config/environment.js';
import { AccountTokenModel } from '../models/account-token.model.js';
import { RefreshTokenModel } from '../models/refresh-token.model.js';
import { UniversityModel } from '../models/university.model.js';
import { UserRepository } from '../repositories/user.repository.js';
import { emailService } from './email.service.js';
import { signAccessToken, signRefreshToken } from '../utils/tokens.js';

export function serializeAuthenticatedUser(user: {
  _id: unknown;
  universityId?: unknown;
  email: string;
  firstName: string;
  lastName: string;
  role: AuthenticatedUser['role'];
  photoUrl?: string | null;
}): AuthenticatedUser {
  return {
    id: String(user._id),
    universityId: String(user.universityId),
    email: user.email,
    fullName: `${user.firstName} ${user.lastName}`,
    role: user.role,
    ...(user.photoUrl ? { photoUrl: user.photoUrl } : {}),
  };
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
interface RegistrationInput {
  readonly universityId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly password: string;
}

export function assertDemoRegistrationAllowed(
  input: Pick<RegistrationInput, 'universityId'> & { readonly role: UserRole },
  enabled = environment.ALLOW_DEMO_ROLE_REGISTRATION,
): void {
  if (!enabled)
    throw Object.assign(new Error('Assessment role registration is not currently available.'), {
      statusCode: 403,
    });
  if (input.universityId.trim().toLowerCase() !== 'lagos-metropolitan-university')
    throw Object.assign(
      new Error('Assessment registration is limited to the demonstration university.'),
      {
        statusCode: 403,
      },
    );
  if (!ASSESSMENT_REGISTRATION_ROLES.some((role) => role === input.role))
    throw Object.assign(
      new Error('This account role is not available for assessment registration.'),
      {
        statusCode: 403,
      },
    );
}

export class AuthService {
  private readonly users = new UserRepository();
  async register(input: RegistrationInput): Promise<AuthenticatedUser> {
    return this.createRegistration(input, 'student');
  }
  async registerDemo(
    input: RegistrationInput & { readonly role: (typeof ASSESSMENT_REGISTRATION_ROLES)[number] },
  ): Promise<AuthenticatedUser> {
    assertDemoRegistrationAllowed(input);
    return this.createRegistration(input, input.role);
  }
  private async createRegistration(
    input: RegistrationInput,
    role: (typeof ASSESSMENT_REGISTRATION_ROLES)[number],
  ): Promise<AuthenticatedUser> {
    const universityId = await this.resolveUniversity(input.universityId);
    if (!universityId) throw new Error('Institution resolution failed.');
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(universityId, normalizedEmail);
    if (existing)
      throw Object.assign(new Error('An account with this email already exists.'), {
        statusCode: 409,
      });
    const user = await this.users.create({
      ...input,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      universityId,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(input.password, environment.BCRYPT_ROUNDS),
      role,
    });
    const publicUser = this.toUser(user);
    const token = await this.issueAccountToken(publicUser, 'verify_email', 24 * 60 * 60 * 1000);
    await emailService.sendVerification(publicUser.email, publicUser.fullName, token);
    return publicUser;
  }
  async login(input: {
    universityId: string;
    email: string;
    password: string;
    rememberMe?: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: AuthenticatedUser; tokens: TokenPair }> {
    const universityId = await this.resolveUniversity(input.universityId, false);
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = universityId ? await this.users.findByEmail(universityId, normalizedEmail) : null;

    if (!user) {
      throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
    }

    if (user.lockedUntil) {
      if (user.lockedUntil > new Date()) {
        throw Object.assign(
          new Error('This account is temporarily locked. Please try again later.'),
          { statusCode: 423 },
        );
      }
      user.accountStatus = 'active';
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    if (!(await bcrypt.compare(input.password, user.passwordHash))) {
      await user.updateOne({
        $inc: { failedLoginAttempts: 1 },
        ...(user.failedLoginAttempts + 1 >= MAX_LOGIN_ATTEMPTS
          ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS), accountStatus: 'locked' }
          : {}),
      });
      throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
    }

    if (!user.isVerified || user.accountStatus === 'pending_verification') {
      throw Object.assign(
        new Error(
          'Your email address is not verified. Please check your inbox or request a new verification link.',
        ),
        { statusCode: 403 },
      );
    }

    if (user.accountStatus === 'suspended') {
      throw Object.assign(
        new Error(
          'This account has been suspended. Please contact your institution administrator.',
        ),
        { statusCode: 403 },
      );
    }

    if (user.accountStatus !== 'active') {
      throw Object.assign(new Error('This account is not active.'), { statusCode: 403 });
    }

    await user.updateOne({
      failedLoginAttempts: 0,
      accountStatus: 'active',
      $unset: { lockedUntil: 1 },
      lastLogin: new Date(),
    });
    const publicUser = this.toUser(user);
    return {
      user: publicUser,
      tokens: await this.createTokens(
        publicUser,
        input.ipAddress,
        input.userAgent,
        input.rememberMe,
      ),
    };
  }
  async refresh(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: AuthenticatedUser; tokens: TokenPair; persistent: boolean }> {
    const hash = this.hashToken(refreshToken);
    const stored = await RefreshTokenModel.findOne({
      tokenHash: hash,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).exec();
    if (!stored) {
      const reused = await RefreshTokenModel.findOne({ tokenHash: hash })
        .select('userId')
        .lean()
        .exec();
      if (reused) await this.revokeAll(String(reused.userId));
      throw Object.assign(new Error('Session is invalid or expired.'), { statusCode: 401 });
    }
    await stored.updateOne({ revokedAt: new Date() });
    const user = await this.users.findById(stored.userId.toString());
    if (!user || user.accountStatus !== 'active')
      throw Object.assign(new Error('Account is not active.'), { statusCode: 401 });
    const publicUser = this.toUser(user);
    return {
      user: publicUser,
      tokens: await this.createTokens(publicUser, ipAddress, userAgent, stored.persistent),
      persistent: stored.persistent,
    };
  }
  async revoke(refreshToken: string): Promise<void> {
    await RefreshTokenModel.updateOne(
      { tokenHash: this.hashToken(refreshToken) },
      { revokedAt: new Date() },
    ).exec();
  }
  async revokeAll(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
    ).exec();
  }
  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const result = await RefreshTokenModel.updateOne(
      { userId, sessionId, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
    ).exec();
    return result.modifiedCount === 1;
  }
  async sessions(userId: string): Promise<
    readonly {
      sessionId: string;
      createdAt: string;
      expiresAt: string;
      ipAddress?: string;
      userAgent?: string;
    }[]
  > {
    const sessions = await RefreshTokenModel.find({
      userId,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return sessions.map((session) => ({
      sessionId: session.sessionId,
      createdAt: session._id.getTimestamp().toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      ...(session.ipAddress ? { ipAddress: session.ipAddress } : {}),
      ...(session.userAgent ? { userAgent: session.userAgent } : {}),
    }));
  }
  async verifyEmail(token: string): Promise<void> {
    const stored = await this.consumeAccountToken(token, 'verify_email');
    await this.users.findById(String(stored.userId)).then(async (user) => {
      if (!user) throw Object.assign(new Error('Account was not found.'), { statusCode: 404 });
      await user.updateOne({ isVerified: true, accountStatus: 'active' });
    });
  }
  async resendVerification(university: string, email: string): Promise<void> {
    const universityId = await this.resolveUniversity(university, false);
    if (!universityId) return;
    const user = await this.users.findByEmail(universityId, email.toLowerCase());
    if (!user || user.isVerified) return;
    const publicUser = this.toUser(user);
    const token = await this.issueAccountToken(publicUser, 'verify_email', 24 * 60 * 60 * 1000);
    await emailService.sendVerification(publicUser.email, publicUser.fullName, token);
  }
  async requestPasswordReset(university: string, email: string): Promise<void> {
    const universityId = await this.resolveUniversity(university, false);
    if (!universityId) return;
    const user = await this.users.findByEmail(universityId, email.toLowerCase());
    if (!user || !user.isVerified) return;
    const publicUser = this.toUser(user);
    const token = await this.issueAccountToken(publicUser, 'reset_password', 60 * 60 * 1000);
    await emailService.sendPasswordReset(publicUser.email, publicUser.fullName, token);
  }
  async resetPassword(token: string, password: string): Promise<void> {
    const stored = await this.consumeAccountToken(token, 'reset_password');
    const user = await this.users.findById(String(stored.userId));
    if (!user) throw Object.assign(new Error('Account was not found.'), { statusCode: 404 });
    await user.updateOne({
      passwordHash: await bcrypt.hash(password, environment.BCRYPT_ROUNDS),
      failedLoginAttempts: 0,
      accountStatus: 'active',
      $unset: { lockedUntil: 1 },
    });
    await this.revokeAll(String(user._id));
  }
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash)))
      throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
    if (await bcrypt.compare(newPassword, user.passwordHash))
      throw Object.assign(new Error('Choose a password you have not just used.'), {
        statusCode: 409,
      });
    await user.updateOne({
      passwordHash: await bcrypt.hash(newPassword, environment.BCRYPT_ROUNDS),
    });
    await this.revokeAll(userId);
  }
  toActor(user: AuthenticatedUser, sessionId: string): RequestActor {
    return { ...user, sessionId, permissions: ROLE_PERMISSIONS[user.role] };
  }
  private async createTokens(
    user: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
    persistent = false,
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const accessToken = signAccessToken({
      sub: user.id,
      universityId: user.universityId,
      role: user.role,
    });
    const refreshToken = signRefreshToken({ sub: user.id, sessionId });
    await RefreshTokenModel.create({
      universityId: user.universityId,
      userId: user.id,
      sessionId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress,
      userAgent,
      persistent,
    });
    return { accessToken, refreshToken };
  }
  private async resolveUniversity(reference: string, required = true): Promise<string | null> {
    const trimmed = reference.trim();
    const university = await UniversityModel.findOne({
      ...(isValidObjectId(trimmed) ? { _id: trimmed } : { slug: trimmed.toLowerCase() }),
      status: 'active',
    })
      .select('_id')
      .lean()
      .exec();
    if (!university && required)
      throw Object.assign(new Error('Institution account was not found.'), { statusCode: 404 });
    return university ? String(university._id) : null;
  }
  private async issueAccountToken(
    user: AuthenticatedUser,
    purpose: 'verify_email' | 'reset_password',
    lifetimeMs: number,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await AccountTokenModel.updateMany(
      { userId: user.id, purpose, usedAt: { $exists: false } },
      { usedAt: new Date() },
    ).exec();
    await AccountTokenModel.create({
      universityId: user.universityId,
      userId: user.id,
      purpose,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + lifetimeMs),
      createdBy: user.id,
    });
    return token;
  }
  private async consumeAccountToken(token: string, purpose: 'verify_email' | 'reset_password') {
    const stored = await AccountTokenModel.findOneAndUpdate(
      {
        tokenHash: this.hashToken(token),
        purpose,
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      },
      { usedAt: new Date() },
      { new: true },
    ).exec();
    if (!stored)
      throw Object.assign(new Error('This secure link is invalid or has expired.'), {
        statusCode: 400,
      });
    return stored;
  }
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  private toUser(user: {
    _id: unknown;
    universityId?: unknown;
    email: string;
    firstName: string;
    lastName: string;
    role: AuthenticatedUser['role'];
    photoUrl?: string | null;
  }): AuthenticatedUser {
    return serializeAuthenticatedUser(user);
  }
}
export const authService = new AuthService();
