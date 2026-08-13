import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const classScheduleSchema = new Schema({
  courseId: { type: Schema.Types.ObjectId, required: true, ref: 'Course', index: true },
  lecturerId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true },
  venue: { type: String, required: true, trim: true, maxlength: 200 },
  timeZone: { type: String, required: true, trim: true, maxlength: 80 },
  status: {
    type: String,
    enum: ['scheduled', 'cancelled', 'completed'],
    default: 'scheduled',
    index: true,
  },
  revision: { type: Number, min: 1, default: 1 },
  cancellationReason: { type: String, trim: true, maxlength: 300, default: undefined },
});
classScheduleSchema.index({ universityId: 1, status: 1, startsAt: 1 });
classScheduleSchema.index({ universityId: 1, courseId: 1, startsAt: 1 });
applyTenantAuditPlugin(classScheduleSchema);
export type ClassSchedule = InferSchemaType<typeof classScheduleSchema>;
export const ClassScheduleModel =
  (models.ClassSchedule as unknown as Model<ClassSchedule & TenantAuditedDocument> | undefined) ??
  model<ClassSchedule & TenantAuditedDocument>('ClassSchedule', classScheduleSchema);
