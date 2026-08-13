import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const notificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  title: { type: String, required: true, maxlength: 160 },
  body: { type: String, required: true, maxlength: 2000 },
  category: { type: String, required: true, index: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  readAt: Date,
  archivedAt: Date,
  deletedAt: Date,
  metadata: { type: Schema.Types.Mixed, default: {} },
  deliveryKey: { type: String, maxlength: 300, default: undefined, select: false },
});
notificationSchema.index({ universityId: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index(
  { universityId: 1, deliveryKey: 1 },
  { unique: true, partialFilterExpression: { deliveryKey: { $type: 'string' } } },
);
applyTenantAuditPlugin(notificationSchema);
export type Notification = InferSchemaType<typeof notificationSchema>;
export const NotificationModel =
  (models.Notification as unknown as Model<Notification & TenantAuditedDocument> | undefined) ??
  model<Notification & TenantAuditedDocument>('Notification', notificationSchema);
