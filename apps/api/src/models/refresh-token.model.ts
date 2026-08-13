import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const refreshTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  tokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: undefined },
  ipAddress: { type: String, default: undefined },
  userAgent: { type: String, default: undefined },
  persistent: { type: Boolean, default: false },
});
applyTenantAuditPlugin(refreshTokenSchema);
export type RefreshToken = InferSchemaType<typeof refreshTokenSchema>;
export const RefreshTokenModel =
  (models.RefreshToken as unknown as Model<RefreshToken & TenantAuditedDocument> | undefined) ??
  model<RefreshToken & TenantAuditedDocument>('RefreshToken', refreshTokenSchema);
