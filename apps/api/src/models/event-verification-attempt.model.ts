import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const eventVerificationAttemptSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, required: true, ref: 'Event', index: true },
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    index: true,
    default: undefined,
  },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  outcome: {
    type: String,
    enum: ['success', 'failure', 'duplicate', 'suspicious'],
    required: true,
    index: true,
  },
  failureType: {
    type: String,
    enum: ['gps', 'face', 'duplicate', 'credential', 'permission', 'session', 'other'],
    default: undefined,
    index: true,
  },
  method: {
    type: String,
    enum: ['dynamic_qr', 'pin', 'manual', 'unknown'],
    required: true,
    default: 'unknown',
  },
  ipHash: { type: String, maxlength: 64, select: false, default: undefined },
  deviceHash: { type: String, maxlength: 64, select: false, default: undefined },
  occurredAt: { type: Date, required: true, default: Date.now, index: true },
  reasonCode: { type: String, trim: true, maxlength: 80, default: undefined },
});

eventVerificationAttemptSchema.index({ universityId: 1, eventId: 1, occurredAt: -1 });
eventVerificationAttemptSchema.index({
  universityId: 1,
  eventId: 1,
  failureType: 1,
  occurredAt: -1,
});
eventVerificationAttemptSchema.index({ universityId: 1, userId: 1, outcome: 1, occurredAt: -1 });
applyTenantAuditPlugin(eventVerificationAttemptSchema);

export type EventVerificationAttempt = InferSchemaType<typeof eventVerificationAttemptSchema>;
export const EventVerificationAttemptModel =
  (models.EventVerificationAttempt as unknown as
    Model<EventVerificationAttempt & TenantAuditedDocument> | undefined) ??
  model<EventVerificationAttempt & TenantAuditedDocument>(
    'EventVerificationAttempt',
    eventVerificationAttemptSchema,
  );
