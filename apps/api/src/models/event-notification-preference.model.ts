import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const eventNotificationPreferenceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  enabled: { type: Boolean, default: true },
  channels: {
    type: [{ type: String, enum: ['in_app', 'email', 'push', 'sms'] }],
    default: ['in_app'],
  },
  informationalEnabled: { type: Boolean, default: true },
  operationalEnabled: { type: Boolean, default: true },
  postEventEnabled: { type: Boolean, default: true },
  reportAvailabilityEnabled: { type: Boolean, default: true },
});

eventNotificationPreferenceSchema.index({ universityId: 1, userId: 1 }, { unique: true });
applyTenantAuditPlugin(eventNotificationPreferenceSchema);

export type EventNotificationPreferenceRecord = InferSchemaType<
  typeof eventNotificationPreferenceSchema
>;
export const EventNotificationPreferenceModel =
  (models.EventNotificationPreference as unknown as
    Model<EventNotificationPreferenceRecord & TenantAuditedDocument> | undefined) ??
  model<EventNotificationPreferenceRecord & TenantAuditedDocument>(
    'EventNotificationPreference',
    eventNotificationPreferenceSchema,
  );
