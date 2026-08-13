import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const announcementReceiptSchema = new Schema({
  announcementId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Announcement',
    index: true,
  },
  recipientId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'delivered', 'failed'],
    default: 'pending',
    index: true,
  },
  deliveredAt: { type: Date, default: undefined },
  readAt: { type: Date, default: undefined, index: true },
  acknowledgedAt: { type: Date, default: undefined, index: true },
  failureCode: { type: String, trim: true, maxlength: 100, default: undefined },
});

announcementReceiptSchema.index(
  { universityId: 1, announcementId: 1, recipientId: 1 },
  { unique: true },
);
announcementReceiptSchema.index({ universityId: 1, recipientId: 1, createdAt: -1 });
announcementReceiptSchema.index({ universityId: 1, announcementId: 1, deliveryStatus: 1 });
applyTenantAuditPlugin(announcementReceiptSchema);

export type AnnouncementReceiptRecord = InferSchemaType<typeof announcementReceiptSchema>;
export const AnnouncementReceiptModel =
  (models.AnnouncementReceipt as unknown as
    Model<AnnouncementReceiptRecord & TenantAuditedDocument> | undefined) ??
  model<AnnouncementReceiptRecord & TenantAuditedDocument>(
    'AnnouncementReceipt',
    announcementReceiptSchema,
  );
