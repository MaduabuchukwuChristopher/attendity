import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const curriculumMappingSchema = new Schema({
  courseId: { type: Schema.Types.ObjectId, required: true, ref: 'Course', index: true },
  programmeId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'InstitutionStructure',
    index: true,
  },
  levelId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'InstitutionStructure',
    index: true,
  },
  termId: { type: Schema.Types.ObjectId, required: true, ref: 'InstitutionStructure', index: true },
  classification: { type: String, enum: ['core', 'elective'], required: true, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
});

curriculumMappingSchema.index(
  { universityId: 1, courseId: 1, programmeId: 1, levelId: 1, termId: 1 },
  { unique: true },
);
applyTenantAuditPlugin(curriculumMappingSchema);

export type CurriculumMapping = InferSchemaType<typeof curriculumMappingSchema>;
export const CurriculumMappingModel =
  (models.CurriculumMapping as unknown as
    Model<CurriculumMapping & TenantAuditedDocument> | undefined) ??
  model<CurriculumMapping & TenantAuditedDocument>('CurriculumMapping', curriculumMappingSchema);
