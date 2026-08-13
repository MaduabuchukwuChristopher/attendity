import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { EVENT_ATTENDANCE_METHODS, EVENT_STATUSES, EVENT_TYPES, USER_ROLES } from '@qr/shared';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const notificationChannels = ['in_app', 'email', 'push', 'sms'] as const;

const audienceSchema = new Schema(
  {
    campus: { type: String, trim: true, maxlength: 160, default: undefined },
    facultyName: { type: String, trim: true, maxlength: 160, default: undefined },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: undefined },
    programme: { type: String, trim: true, maxlength: 160, default: undefined },
    level: { type: String, trim: true, maxlength: 40, default: undefined },
    roles: [{ type: String, enum: USER_ROLES }],
  },
  { _id: false },
);

const attachmentSchema = new Schema(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'MediaAsset', default: undefined },
    name: { type: String, required: true, trim: true, maxlength: 180 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    mimeType: { type: String, required: true, trim: true, maxlength: 100 },
    sizeBytes: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
  },
  { _id: false },
);

const eventSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 180, index: true },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  eventType: { type: String, enum: EVENT_TYPES, required: true, index: true },
  customType: { type: String, trim: true, maxlength: 100, default: undefined },
  organizerId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  organizerName: { type: String, required: true, trim: true, maxlength: 180 },
  campus: { type: String, trim: true, maxlength: 160, default: undefined },
  venue: { type: String, required: true, trim: true, maxlength: 240 },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true, index: true },
  timeZone: { type: String, required: true, trim: true, maxlength: 80 },
  academicSessionId: {
    type: Schema.Types.ObjectId,
    ref: 'InstitutionStructure',
    default: undefined,
    index: true,
  },
  academicSessionName: { type: String, trim: true, maxlength: 180, default: undefined },
  termId: {
    type: Schema.Types.ObjectId,
    ref: 'InstitutionStructure',
    default: undefined,
    index: true,
  },
  termName: { type: String, trim: true, maxlength: 180, default: undefined },
  capacity: { type: Number, min: 1, max: 100_000, default: undefined },
  registrationRequired: { type: Boolean, required: true, default: false },
  mandatory: { type: Boolean, required: true, default: false, index: true },
  audience: { type: audienceSchema, required: true, default: { roles: [] } },
  reminderOffsetsMinutes: {
    type: [{ type: Number, min: 5, max: 43_200 }],
    default: [1440, 60],
  },
  notificationChannels: {
    type: [{ type: String, enum: notificationChannels }],
    default: ['in_app'],
  },
  postEventMessage: { type: String, trim: true, maxlength: 1000, default: undefined },
  participantReportAvailable: { type: Boolean, default: false },
  attendanceMethods: {
    type: [{ type: String, enum: EVENT_ATTENDANCE_METHODS }],
    required: true,
    default: ['dynamic_qr'],
  },
  qrRotationSeconds: { type: Number, min: 30, max: 120, default: 60 },
  gps: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    maximumRadiusMetres: { type: Number, min: 10, max: 5000, default: 100 },
  },
  faceVerificationRequired: { type: Boolean, required: true, default: false },
  manualAttendanceAllowed: { type: Boolean, required: true, default: false },
  pinAttendanceAllowed: { type: Boolean, required: true, default: false },
  attendancePinHash: { type: String, select: false, maxlength: 64, default: undefined },
  bannerUrl: { type: String, trim: true, maxlength: 2048, default: undefined },
  attachments: { type: [attachmentSchema], default: [] },
  status: { type: String, enum: EVENT_STATUSES, required: true, default: 'draft', index: true },
  publishedAt: { type: Date, default: undefined },
  cancelledAt: { type: Date, default: undefined },
  cancellationReason: { type: String, trim: true, maxlength: 500, default: undefined },
  remindersProcessed: { type: [Number], default: [], select: false },
});

eventSchema.index({ universityId: 1, status: 1, startsAt: 1 });
eventSchema.index({ universityId: 1, organizerId: 1, startsAt: -1 });
eventSchema.index({ universityId: 1, mandatory: 1, startsAt: 1 });
eventSchema.index({ universityId: 1, academicSessionId: 1, termId: 1, startsAt: 1 });
eventSchema.index({ title: 'text', description: 'text', venue: 'text' });
applyTenantAuditPlugin(eventSchema);

export type EventRecord = InferSchemaType<typeof eventSchema>;
export const EventModel =
  (models.Event as unknown as Model<EventRecord & TenantAuditedDocument> | undefined) ??
  model<EventRecord & TenantAuditedDocument>('Event', eventSchema);
