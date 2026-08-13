import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ROLE_PERMISSIONS } from '@qr/shared';
import type { RequestActor, StaffInvitationSummary, StaffInvitableRole, UserRole } from '@qr/types';
import { environment } from '../config/environment.js';
import { StaffInvitationModel } from '../models/staff-invitation.model.js';
import { UniversityModel } from '../models/university.model.js';
import { UserModel } from '../models/user.model.js';
import type {
  AcceptInvitationInput,
  CreateInvitationInput,
} from '../validators/invitation.validator.js';
import { auditService } from './audit.service.js';
import { emailService } from './email.service.js';

const INVITATION_LIFETIME_MS = 72 * 60 * 60 * 1000;

function statusError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function canInviteRole(actorRole: UserRole, _targetRole: StaffInvitableRole): boolean {
  if (actorRole === 'super_admin') return true;
  return actorRole === 'university_admin';
}

function summary(record: Record<string, unknown>): StaffInvitationSummary {
  const acceptedAt =
    record.acceptedAt instanceof Date ? record.acceptedAt.toISOString() : undefined;
  const revokedAt = record.revokedAt instanceof Date ? record.revokedAt.toISOString() : undefined;
  return {
    id: String(record._id),
    email: String(record.email),
    role: record.role as StaffInvitableRole,
    status: record.status as StaffInvitationSummary['status'],
    expiresAt: new Date(record.expiresAt as Date).toISOString(),
    ...(acceptedAt ? { acceptedAt } : {}),
    ...(revokedAt ? { revokedAt } : {}),
    createdAt: new Date(record.createdAt as Date).toISOString(),
  };
}

export class InvitationService {
  async create(actor: RequestActor, input: CreateInvitationInput): Promise<StaffInvitationSummary> {
    if (!canInviteRole(actor.role, input.role))
      throw statusError('You cannot invite this staff role.', 403);
    const email = input.email.trim().toLowerCase();
    if (await UserModel.exists({ universityId: actor.universityId, email }))
      throw statusError('An account with this email already exists.', 409);

    await StaffInvitationModel.updateMany(
      { universityId: actor.universityId, email, status: 'pending' },
      { status: 'revoked', revokedAt: new Date(), updatedBy: actor.id },
    ).exec();
    const token = randomBytes(32).toString('base64url');
    const invitation = await StaffInvitationModel.create({
      universityId: actor.universityId,
      email,
      role: input.role,
      scope: {
        ...(input.campus ? { campus: input.campus } : {}),
        ...(input.facultyName ? { facultyName: input.facultyName } : {}),
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      },
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await emailService.sendStaffInvitation(email, input.role, token);
    await auditService.record({
      action: 'staff_invitation.created',
      resourceType: 'staff_invitation',
      resourceId: invitation.id,
      actor,
      newValue: { email, role: input.role, scope: invitation.scope },
    });
    return summary(invitation.toJSON());
  }

  async list(actor: RequestActor): Promise<readonly StaffInvitationSummary[]> {
    const records = await StaffInvitationModel.find({ universityId: actor.universityId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return records.map((record) => summary(record as unknown as Record<string, unknown>));
  }

  async revoke(actor: RequestActor, invitationId: string): Promise<void> {
    const invitation = await StaffInvitationModel.findOneAndUpdate(
      { _id: invitationId, universityId: actor.universityId, status: 'pending' },
      { status: 'revoked', revokedAt: new Date(), updatedBy: actor.id },
      { new: true },
    ).exec();
    if (!invitation) throw statusError('Pending invitation was not found.', 404);
    await auditService.record({
      action: 'staff_invitation.revoked',
      resourceType: 'staff_invitation',
      resourceId: invitation.id,
      actor,
      newValue: { status: 'revoked' },
    });
  }

  async inspect(token: string): Promise<{
    email: string;
    role: StaffInvitableRole;
    institutionName: string;
    expiresAt: string;
  }> {
    const invitation = await StaffInvitationModel.findOne({ tokenHash: hashToken(token) })
      .select('+tokenHash')
      .lean()
      .exec();
    if (!invitation || invitation.status !== 'pending')
      throw statusError('This invitation is invalid or is no longer available.', 404);
    if (invitation.expiresAt <= new Date())
      throw statusError('This invitation has expired. Ask your institution to resend it.', 410);
    const university = await UniversityModel.findById(invitation.universityId)
      .select('name')
      .lean()
      .exec();
    if (!university) throw statusError('The inviting institution is unavailable.', 404);
    return {
      email: invitation.email,
      role: invitation.role,
      institutionName: university.name,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async accept(input: AcceptInvitationInput): Promise<void> {
    const now = new Date();
    const invitation = await StaffInvitationModel.findOneAndUpdate(
      {
        tokenHash: hashToken(input.token),
        status: 'pending',
        expiresAt: { $gt: now },
      },
      { status: 'accepted', acceptedAt: now },
      { new: true },
    )
      .select('+tokenHash')
      .exec();
    if (!invitation)
      throw statusError('This invitation is invalid, expired, or has already been used.', 410);
    try {
      const existing = await UserModel.exists({
        universityId: invitation.universityId,
        email: invitation.email,
      });
      if (existing) throw statusError('An account with this email already exists.', 409);
      const user = await UserModel.create({
        universityId: invitation.universityId,
        email: invitation.email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        passwordHash: await bcrypt.hash(input.password, environment.BCRYPT_ROUNDS),
        role: invitation.role,
        accountStatus: 'active',
        isVerified: true,
        ...(invitation.scope?.campus ? { campus: invitation.scope.campus } : {}),
        ...(invitation.scope?.facultyName ? { facultyName: invitation.scope.facultyName } : {}),
        ...(invitation.scope?.departmentId ? { departmentId: invitation.scope.departmentId } : {}),
        createdBy: invitation.createdBy,
        updatedBy: invitation.createdBy,
      });
      const acceptedActor: RequestActor = {
        id: user.id,
        universityId: String(invitation.universityId),
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        sessionId: 'invitation-acceptance',
        permissions: ROLE_PERMISSIONS[user.role],
      };
      await auditService.record({
        action: 'staff_invitation.accepted',
        resourceType: 'staff_invitation',
        resourceId: invitation.id,
        actor: acceptedActor,
        newValue: { userId: user.id, role: user.role },
      });
    } catch (error) {
      await invitation.updateOne({ status: 'pending', $unset: { acceptedAt: 1 } });
      throw error;
    }
  }
}

export const invitationService = new InvitationService();
