import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

export const INSTITUTION_STRUCTURE_KINDS = [
  'campus',
  'faculty',
  'programme',
  'level',
  'academic_session',
  'term',
  'venue',
] as const;

const institutionStructureSchema = new Schema({
  kind: { type: String, enum: INSTITUTION_STRUCTURE_KINDS, required: true, index: true },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 32 },
  name: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 1000, default: undefined },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'InstitutionStructure',
    index: true,
    default: undefined,
  },
  startsAt: { type: Date, default: undefined },
  endsAt: { type: Date, default: undefined },
  isCurrent: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
});

institutionStructureSchema.index(
  { universityId: 1, kind: 1, code: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } },
);
institutionStructureSchema.index({ universityId: 1, kind: 1, status: 1, name: 1 });
institutionStructureSchema.index({ universityId: 1, parentId: 1, status: 1 });
institutionStructureSchema.index(
  { universityId: 1, kind: 1, isCurrent: 1 },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true, deletedAt: { $exists: false } },
  },
);

applyTenantAuditPlugin(institutionStructureSchema);

export type InstitutionStructure = InferSchemaType<typeof institutionStructureSchema>;
export const InstitutionStructureModel =
  (models.InstitutionStructure as unknown as
    Model<InstitutionStructure & TenantAuditedDocument> | undefined) ??
  model<InstitutionStructure & TenantAuditedDocument>(
    'InstitutionStructure',
    institutionStructureSchema,
  );
