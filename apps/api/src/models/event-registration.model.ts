import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { EVENT_PARTICIPATION_STATUSES } from '@qr/shared';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const eventRegistrationSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, required: true, ref: 'Event', index: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  registrationStatus: {
    type: String,
    enum: ['invited', 'registered', 'waitlisted', 'cancelled'],
    required: true,
    default: 'invited',
    index: true,
  },
  participationStatus: {
    type: String,
    enum: EVENT_PARTICIPATION_STATUSES,
    required: true,
    default: 'pending',
    index: true,
  },
  mandatory: { type: Boolean, required: true, default: false, index: true },
  registeredAt: { type: Date, default: undefined },
  excusedAt: { type: Date, default: undefined },
  excusedBy: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  excuseReason: { type: String, trim: true, maxlength: 500, default: undefined },
  lastReminderAt: { type: Date, default: undefined },
});

eventRegistrationSchema.index({ universityId: 1, eventId: 1, userId: 1 }, { unique: true });
eventRegistrationSchema.index({ universityId: 1, userId: 1, participationStatus: 1 });
eventRegistrationSchema.index({ universityId: 1, eventId: 1, participationStatus: 1 });
applyTenantAuditPlugin(eventRegistrationSchema);

export type EventRegistrationRecord = InferSchemaType<typeof eventRegistrationSchema>;
export const EventRegistrationModel =
  (models.EventRegistration as unknown as
    Model<EventRegistrationRecord & TenantAuditedDocument> | undefined) ??
  model<EventRegistrationRecord & TenantAuditedDocument>(
    'EventRegistration',
    eventRegistrationSchema,
  );
