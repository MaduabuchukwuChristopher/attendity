import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { USER_ROLES } from '@qr/shared';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const userSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true, index: true },
    accountStatus: {
      type: String,
      enum: ['pending_verification', 'active', 'locked', 'suspended'],
      default: 'pending_verification',
      index: true,
    },
    isVerified: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: undefined, select: false },
    lastLogin: { type: Date, default: undefined },
    phone: { type: String, trim: true, maxlength: 24, default: undefined },
    photoUrl: { type: String, trim: true, maxlength: 2048, default: undefined },
    matricNumber: { type: String, trim: true, uppercase: true, maxlength: 40, default: undefined },
    campus: { type: String, trim: true, maxlength: 160, default: undefined, index: true },
    facultyName: { type: String, trim: true, maxlength: 160, default: undefined, index: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: undefined,
      index: true,
    },
    programme: { type: String, trim: true, maxlength: 160, default: undefined },
    level: { type: String, trim: true, maxlength: 40, default: undefined },
  },
  { collection: 'users' },
);
userSchema.index(
  { universityId: 1, email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
userSchema.index(
  { universityId: 1, matricNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      matricNumber: { $type: 'string' },
    },
  },
);
applyTenantAuditPlugin(userSchema);
export type User = InferSchemaType<typeof userSchema>;
export const UserModel =
  (models.User as unknown as Model<User & TenantAuditedDocument> | undefined) ??
  model<User & TenantAuditedDocument>('User', userSchema);
