import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const courseSchema = new Schema({
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 24 },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  creditUnits: { type: Number, required: true, min: 1, max: 12 },
  departmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Department', index: true },
  lecturerId: {
    type: Schema.Types.ObjectId,
    required: false,
    ref: 'User',
    index: true,
    default: undefined,
  },
  attendanceRequirement: { type: Number, required: true, min: 0, max: 100, default: 75 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
});
courseSchema.index(
  { universityId: 1, code: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
applyTenantAuditPlugin(courseSchema);
export type Course = InferSchemaType<typeof courseSchema>;
export const CourseModel =
  (models.Course as unknown as Model<Course & TenantAuditedDocument> | undefined) ??
  model<Course & TenantAuditedDocument>('Course', courseSchema);
