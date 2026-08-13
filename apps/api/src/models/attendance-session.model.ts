import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const attendanceSessionSchema = new Schema({
  contextType: {
    type: String,
    enum: ['CLASS_SESSION', 'EVENT_SESSION'],
    required: true,
    default: 'CLASS_SESSION',
    index: true,
  },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true, default: undefined },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true, default: undefined },
  lecturerId: { type: Schema.Types.ObjectId, ref: 'User', index: true, default: undefined },
  ownerId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  openedAt: { type: Date, required: true, default: Date.now },
  closesAt: { type: Date, required: true, index: true },
  closedAt: { type: Date, default: undefined },
  status: { type: String, enum: ['open', 'closed'], required: true, default: 'open', index: true },
  checkInCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 8,
    maxlength: 32,
    select: false,
  },
  qrMode: {
    type: String,
    enum: ['static', 'rotating'],
    required: true,
    default: 'rotating',
    index: true,
  },
  qrRotationSeconds: { type: Number, required: true, min: 30, max: 120, default: 60 },
  qrRotatedAt: { type: Date, required: true, default: Date.now },
  qrNonce: { type: String, required: true, select: false, minlength: 20, maxlength: 128 },
  qrNonceHash: { type: String, required: true, select: false, minlength: 64, maxlength: 64 },
  staticQrToken: { type: String, select: false, maxlength: 4096, default: undefined },
  gpsRequired: { type: Boolean, required: true, default: false },
  latitude: { type: Number, min: -90, max: 90, default: undefined },
  longitude: { type: Number, min: -180, max: 180, default: undefined },
  maximumRadiusMetres: { type: Number, min: 10, max: 1000, default: 50 },
  faceVerificationRequired: { type: Boolean, required: true, default: false },
  dynamicQrEnabled: { type: Boolean, required: true, default: true },
  manualAttendanceAllowed: { type: Boolean, required: true, default: false },
  pinAttendanceAllowed: { type: Boolean, required: true, default: false },
  attendancePinHash: { type: String, select: false, maxlength: 64, default: undefined },
  endingNotificationSentAt: { type: Date, default: undefined },
});
attendanceSessionSchema.pre('validate', function validateContext(next) {
  const validClass = this.contextType === 'CLASS_SESSION' && Boolean(this.courseId);
  const validEvent = this.contextType === 'EVENT_SESSION' && Boolean(this.eventId);
  next(validClass || validEvent ? undefined : new Error('Attendance session context is invalid.'));
});
attendanceSessionSchema.index({ universityId: 1, lecturerId: 1, openedAt: -1 });
attendanceSessionSchema.index({ universityId: 1, contextType: 1, eventId: 1, openedAt: -1 });
attendanceSessionSchema.index(
  { universityId: 1, checkInCode: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
applyTenantAuditPlugin(attendanceSessionSchema);
attendanceSessionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_document, value: Record<string, unknown>) => {
    delete value.checkInCode;
    delete value.qrNonce;
    delete value.qrNonceHash;
    delete value.staticQrToken;
    delete value.attendancePinHash;
    return value;
  },
});

export type AttendanceSession = InferSchemaType<typeof attendanceSessionSchema>;
export const AttendanceSessionModel =
  (models.AttendanceSession as unknown as
    Model<AttendanceSession & TenantAuditedDocument> | undefined) ??
  model<AttendanceSession & TenantAuditedDocument>('AttendanceSession', attendanceSessionSchema);
