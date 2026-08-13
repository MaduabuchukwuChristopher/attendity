import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const attendanceRecordSchema = new Schema({
  contextType: {
    type: String,
    enum: ['CLASS_SESSION', 'EVENT_SESSION'],
    required: true,
    default: 'CLASS_SESSION',
    index: true,
  },
  sessionId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'AttendanceSession',
    index: true,
  },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true, default: undefined },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true, default: undefined },
  studentId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  checkedInAt: { type: Date, required: true, default: Date.now },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'excused', 'rejected', 'pending'],
    required: true,
    default: 'present',
  },
  method: {
    type: String,
    enum: ['qr', 'dynamic_qr', 'manual', 'pin'],
    required: true,
    default: 'qr',
  },
  verificationMethods: {
    type: [{ type: String, enum: ['dynamic_qr', 'gps', 'face', 'manual', 'pin'] }],
    default: ['dynamic_qr'],
  },
  verificationStatus: {
    type: String,
    enum: ['verified', 'pending', 'rejected'],
    required: true,
    default: 'verified',
  },
  qrVerified: { type: Boolean, required: true, default: false },
  pinVerified: { type: Boolean, required: true, default: false },
  manualReason: { type: String, trim: true, maxlength: 500, default: undefined },
  ipAddress: { type: String, trim: true, maxlength: 64, select: false, default: undefined },
  userAgent: { type: String, trim: true, maxlength: 512, select: false, default: undefined },
  gps: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    distanceMetres: Number,
    verified: Boolean,
  },
  faceVerification: {
    confidence: Number,
    verified: Boolean,
    provider: String,
    verifiedAt: Date,
  },
});
attendanceRecordSchema.index(
  { universityId: 1, sessionId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
attendanceRecordSchema.index({ universityId: 1, studentId: 1, courseId: 1 });
attendanceRecordSchema.index({ universityId: 1, studentId: 1, eventId: 1 });
applyTenantAuditPlugin(attendanceRecordSchema);
attendanceRecordSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_document, value: Record<string, unknown>) => {
    delete value.ipAddress;
    delete value.userAgent;
    return value;
  },
});

export type AttendanceRecord = InferSchemaType<typeof attendanceRecordSchema>;
export const AttendanceRecordModel =
  (models.AttendanceRecord as unknown as
    Model<AttendanceRecord & TenantAuditedDocument> | undefined) ??
  model<AttendanceRecord & TenantAuditedDocument>('AttendanceRecord', attendanceRecordSchema);
