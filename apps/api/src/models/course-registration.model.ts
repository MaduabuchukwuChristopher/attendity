import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { COURSE_REGISTRATION_SOURCES, COURSE_REGISTRATION_STATUSES } from '@qr/shared';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const courseRegistrationSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  courseId: { type: Schema.Types.ObjectId, required: true, ref: 'Course', index: true },
  registrationNumber: { type: String, required: true, trim: true, uppercase: true, index: true },
  status: {
    type: String,
    enum: COURSE_REGISTRATION_STATUSES,
    default: 'pending',
    index: true,
  },
  source: {
    type: String,
    enum: COURSE_REGISTRATION_SOURCES,
    default: 'administrator',
    index: true,
  },
  requestedReason: { type: String, trim: true, maxlength: 500, default: undefined },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  reviewedAt: { type: Date, default: undefined },
  reviewNote: { type: String, trim: true, maxlength: 500, default: undefined },
});
courseRegistrationSchema.index(
  { universityId: 1, studentId: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
applyTenantAuditPlugin(courseRegistrationSchema);
export type CourseRegistration = InferSchemaType<typeof courseRegistrationSchema>;
export const CourseRegistrationModel =
  (models.CourseRegistration as unknown as
    Model<CourseRegistration & TenantAuditedDocument> | undefined) ??
  model<CourseRegistration & TenantAuditedDocument>('CourseRegistration', courseRegistrationSchema);
