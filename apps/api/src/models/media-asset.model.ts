import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const mediaAssetSchema = new Schema({
  context: {
    type: String,
    enum: ['announcement', 'event', 'profile', 'institution_logo'],
    required: true,
    index: true,
  },
  provider: { type: String, enum: ['cloudinary'], required: true },
  providerAssetId: { type: String, required: true, trim: true, maxlength: 500 },
  name: { type: String, required: true, trim: true, maxlength: 180 },
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  mimeType: { type: String, required: true, trim: true, maxlength: 100 },
  sizeBytes: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
  checksum: { type: String, required: true, immutable: true, select: false },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    immutable: true,
    index: true,
  },
  status: { type: String, enum: ['ready', 'deleted'], default: 'ready', index: true },
});

mediaAssetSchema.index({ universityId: 1, provider: 1, providerAssetId: 1 }, { unique: true });
mediaAssetSchema.index({ universityId: 1, context: 1, status: 1, createdAt: -1 });
applyTenantAuditPlugin(mediaAssetSchema);

export type MediaAsset = InferSchemaType<typeof mediaAssetSchema>;
export const MediaAssetModel =
  (models.MediaAsset as unknown as Model<MediaAsset & TenantAuditedDocument> | undefined) ??
  model<MediaAsset & TenantAuditedDocument>('MediaAsset', mediaAssetSchema);
