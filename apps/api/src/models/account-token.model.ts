import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const accountTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  purpose: { type: String, enum: ['verify_email', 'reset_password'], required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: { type: Date, default: undefined },
});
applyTenantAuditPlugin(accountTokenSchema);
accountTokenSchema.index({ userId: 1, purpose: 1, usedAt: 1 });

export type AccountToken = InferSchemaType<typeof accountTokenSchema>;
export const AccountTokenModel =
  (models.AccountToken as unknown as Model<AccountToken & TenantAuditedDocument> | undefined) ??
  model<AccountToken & TenantAuditedDocument>('AccountToken', accountTokenSchema);
