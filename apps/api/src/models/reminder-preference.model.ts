import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const channels = ['in_app', 'email', 'push', 'sms'] as const;

const overrideSchema = new Schema(
  {
    scheduleId: { type: Schema.Types.ObjectId, required: true, ref: 'ClassSchedule' },
    enabled: { type: Boolean, default: true },
    offsetMinutes: { type: Number, min: 5, max: 10080, default: undefined },
    channels: [{ type: String, enum: channels }],
  },
  { _id: false },
);

const reminderPreferenceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  enabled: { type: Boolean, default: true },
  defaultOffsetMinutes: { type: Number, min: 5, max: 10080, default: 30 },
  channels: [{ type: String, enum: channels, default: ['in_app'] }],
  preferredTimeZone: { type: String, trim: true, maxlength: 80, default: undefined },
  quietHours: {
    enabled: { type: Boolean, default: false },
    startMinute: { type: Number, min: 0, max: 1439, default: 1320 },
    endMinute: { type: Number, min: 0, max: 1439, default: 420 },
  },
  mutedCourseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  overrides: { type: [overrideSchema], default: [] },
});
reminderPreferenceSchema.index({ universityId: 1, userId: 1 }, { unique: true });
applyTenantAuditPlugin(reminderPreferenceSchema);
export type ReminderPreferenceRecord = InferSchemaType<typeof reminderPreferenceSchema>;
export const ReminderPreferenceModel =
  (models.ReminderPreference as unknown as
    Model<ReminderPreferenceRecord & TenantAuditedDocument> | undefined) ??
  model<ReminderPreferenceRecord & TenantAuditedDocument>(
    'ReminderPreference',
    reminderPreferenceSchema,
  );
