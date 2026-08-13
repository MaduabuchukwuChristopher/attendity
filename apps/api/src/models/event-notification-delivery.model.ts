import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const eventNotificationDeliverySchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, required: true, ref: 'Event', index: true },
  recipientId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  recipientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    select: false,
  },
  recipientName: { type: String, required: true, trim: true, maxlength: 180 },
  channel: { type: String, enum: ['email', 'push'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 240 },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  url: { type: String, trim: true, maxlength: 2048, default: undefined },
  tag: { type: String, trim: true, maxlength: 300, default: undefined },
  status: {
    type: String,
    enum: ['pending', 'processing', 'delivered', 'failed'],
    default: 'pending',
    index: true,
  },
  attemptCount: { type: Number, min: 0, default: 0 },
  nextAttemptAt: { type: Date, default: undefined, index: true },
  claimedAt: { type: Date, default: undefined },
  deliveredAt: { type: Date, default: undefined },
  failureCode: { type: String, trim: true, maxlength: 80, default: undefined },
  idempotencyKey: { type: String, required: true, maxlength: 400 },
});

eventNotificationDeliverySchema.index({ universityId: 1, idempotencyKey: 1 }, { unique: true });
eventNotificationDeliverySchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
eventNotificationDeliverySchema.index({ universityId: 1, eventId: 1, recipientId: 1 });
applyTenantAuditPlugin(eventNotificationDeliverySchema);

export type EventNotificationDelivery = InferSchemaType<typeof eventNotificationDeliverySchema>;
export const EventNotificationDeliveryModel =
  (models.EventNotificationDelivery as unknown as
    Model<EventNotificationDelivery & TenantAuditedDocument> | undefined) ??
  model<EventNotificationDelivery & TenantAuditedDocument>(
    'EventNotificationDelivery',
    eventNotificationDeliverySchema,
  );
