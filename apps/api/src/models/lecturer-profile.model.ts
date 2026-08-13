import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const lecturerProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  employeeNumber: { type: String, trim: true, uppercase: true, maxlength: 40, default: undefined },
  title: { type: String, trim: true, maxlength: 80, default: undefined },
  campusId: {
    type: Schema.Types.ObjectId,
    ref: 'InstitutionStructure',
    index: true,
    default: undefined,
  },
  facultyId: {
    type: Schema.Types.ObjectId,
    ref: 'InstitutionStructure',
    index: true,
    default: undefined,
  },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true, default: undefined },
  office: { type: String, trim: true, maxlength: 160, default: undefined },
  biography: { type: String, trim: true, maxlength: 1000, default: undefined },
  photoAssetId: { type: Schema.Types.ObjectId, ref: 'MediaAsset', default: undefined },
  completedAt: { type: Date, default: undefined },
});

lecturerProfileSchema.index({ universityId: 1, userId: 1 }, { unique: true });
lecturerProfileSchema.index(
  { universityId: 1, employeeNumber: 1 },
  { unique: true, partialFilterExpression: { employeeNumber: { $type: 'string' } } },
);
applyTenantAuditPlugin(lecturerProfileSchema);

export type LecturerProfileRecord = InferSchemaType<typeof lecturerProfileSchema>;
export const LecturerProfileModel =
  (models.LecturerProfile as unknown as
    Model<LecturerProfileRecord & TenantAuditedDocument> | undefined) ??
  model<LecturerProfileRecord & TenantAuditedDocument>('LecturerProfile', lecturerProfileSchema);
