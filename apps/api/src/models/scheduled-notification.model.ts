import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const scheduledNotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  scheduleId: { type: Schema.Types.ObjectId, required: true, ref: 'ClassSchedule', index: true },
  scheduleRevision: { type: Number, required: true, min: 1 },
  courseId: { type: Schema.Types.ObjectId, required: true, ref: 'Course', index: true },
  channel: { type: String, enum: ['in_app', 'email', 'push', 'sms'], required: true },
  kind: { type: String, enum: ['class_reminder'], default: 'class_reminder' },
  scheduledFor: { type: Date, required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'delivered', 'failed', 'cancelled', 'skipped'],
    default: 'pending',
    index: true,
  },
  attemptCount: { type: Number, min: 0, default: 0 },
  nextAttemptAt: { type: Date, default: undefined, index: true },
  claimedAt: { type: Date, default: undefined },
  deliveredAt: { type: Date, default: undefined },
  failureCode: { type: String, maxlength: 80, default: undefined },
  idempotencyKey: { type: String, required: true, maxlength: 300 },
});
scheduledNotificationSchema.index({ universityId: 1, idempotencyKey: 1 }, { unique: true });
scheduledNotificationSchema.index({ status: 1, scheduledFor: 1, nextAttemptAt: 1 });
scheduledNotificationSchema.index({ universityId: 1, userId: 1, createdAt: -1 });
applyTenantAuditPlugin(scheduledNotificationSchema);
export type ScheduledNotification = InferSchemaType<typeof scheduledNotificationSchema>;
export const ScheduledNotificationModel =
  (models.ScheduledNotification as unknown as
    Model<ScheduledNotification & TenantAuditedDocument> | undefined) ??
  model<ScheduledNotification & TenantAuditedDocument>(
    'ScheduledNotification',
    scheduledNotificationSchema,
  );
