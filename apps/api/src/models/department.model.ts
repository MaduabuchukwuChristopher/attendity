import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const departmentSchema = new Schema({
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 16 },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  facultyName: { type: String, required: true, trim: true, maxlength: 160 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
});
departmentSchema.index(
  { universityId: 1, code: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
applyTenantAuditPlugin(departmentSchema);
export type Department = InferSchemaType<typeof departmentSchema>;
export const DepartmentModel =
  (models.Department as unknown as Model<Department & TenantAuditedDocument> | undefined) ??
  model<Department & TenantAuditedDocument>('Department', departmentSchema);
