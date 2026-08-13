import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { STAFF_INVITABLE_ROLES } from '@qr/shared';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const invitationScopeSchema = new Schema(
  {
    campus: { type: String, trim: true, maxlength: 160, default: undefined },
    facultyName: { type: String, trim: true, maxlength: 160, default: undefined },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: undefined },
  },
  { _id: false },
);

const staffInvitationSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  role: { type: String, enum: STAFF_INVITABLE_ROLES, required: true, index: true },
  scope: { type: invitationScopeSchema, default: {} },
  tokenHash: { type: String, required: true, unique: true, select: false },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'revoked', 'expired'],
    default: 'pending',
    index: true,
  },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  acceptedAt: { type: Date, default: undefined },
  revokedAt: { type: Date, default: undefined },
});

staffInvitationSchema.index({ universityId: 1, email: 1, status: 1 });
applyTenantAuditPlugin(staffInvitationSchema);

export type StaffInvitation = InferSchemaType<typeof staffInvitationSchema>;
export const StaffInvitationModel =
  (models.StaffInvitation as unknown as
    Model<StaffInvitation & TenantAuditedDocument> | undefined) ??
  model<StaffInvitation & TenantAuditedDocument>('StaffInvitation', staffInvitationSchema);
