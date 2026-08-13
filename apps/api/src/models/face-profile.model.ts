import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const faceProfileSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  provider: { type: String, required: true, trim: true, maxlength: 80 },
  providerReference: { type: String, required: true, select: false, maxlength: 512 },
  enrolledAt: { type: Date, required: true, default: Date.now },
  lastVerifiedAt: { type: Date, default: undefined },
});
faceProfileSchema.index(
  { universityId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
applyTenantAuditPlugin(faceProfileSchema);

export type FaceProfile = InferSchemaType<typeof faceProfileSchema>;
export const FaceProfileModel =
  (models.FaceProfile as unknown as Model<FaceProfile & TenantAuditedDocument> | undefined) ??
  model<FaceProfile & TenantAuditedDocument>('FaceProfile', faceProfileSchema);
