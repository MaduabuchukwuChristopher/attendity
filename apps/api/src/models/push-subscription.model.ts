import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const pushSubscriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  endpointHash: { type: String, required: true, maxlength: 64 },
  endpoint: { type: String, required: true, maxlength: 4096, select: false },
  expirationTime: { type: Number, default: undefined },
  p256dh: { type: String, required: true, maxlength: 512, select: false },
  auth: { type: String, required: true, maxlength: 512, select: false },
  lastUsedAt: { type: Date, default: undefined },
  revokedAt: { type: Date, default: undefined },
});
pushSubscriptionSchema.index({ universityId: 1, userId: 1, endpointHash: 1 }, { unique: true });
applyTenantAuditPlugin(pushSubscriptionSchema);
export type PushSubscriptionRecord = InferSchemaType<typeof pushSubscriptionSchema>;
export const PushSubscriptionModel =
  (models.PushSubscription as unknown as
    Model<PushSubscriptionRecord & TenantAuditedDocument> | undefined) ??
  model<PushSubscriptionRecord & TenantAuditedDocument>('PushSubscription', pushSubscriptionSchema);
