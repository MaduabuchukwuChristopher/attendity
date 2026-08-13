import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const structureReference = {
  type: Schema.Types.ObjectId,
  required: true,
  ref: 'InstitutionStructure',
  index: true,
} as const;

const studentProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  matricNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  campusId: structureReference,
  facultyId: structureReference,
  departmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Department', index: true },
  programmeId: structureReference,
  levelId: structureReference,
  admissionSessionId: structureReference,
  photoAssetId: { type: Schema.Types.ObjectId, ref: 'MediaAsset', default: undefined },
  completedAt: { type: Date, default: undefined },
});

studentProfileSchema.index({ universityId: 1, userId: 1 }, { unique: true });
studentProfileSchema.index({ universityId: 1, matricNumber: 1 }, { unique: true });
applyTenantAuditPlugin(studentProfileSchema);

export type StudentProfileRecord = InferSchemaType<typeof studentProfileSchema>;
export const StudentProfileModel =
  (models.StudentProfile as unknown as
    Model<StudentProfileRecord & TenantAuditedDocument> | undefined) ??
  model<StudentProfileRecord & TenantAuditedDocument>('StudentProfile', studentProfileSchema);
