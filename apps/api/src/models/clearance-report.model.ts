import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const clearanceReportSchema = new Schema({
  reportId: { type: String, required: true, unique: true, index: true, trim: true },
  verificationCode: { type: String, required: true, unique: true, index: true, select: false },
  verificationTokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
    select: false,
  },
  studentId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  courseId: { type: Schema.Types.ObjectId, required: true, ref: 'Course', index: true },
  registrationId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'CourseRegistration',
    index: true,
  },
  registrationNumber: { type: String, required: true, uppercase: true, trim: true, index: true },
  version: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['valid', 'revoked', 'expired'],
    required: true,
    default: 'valid',
    index: true,
  },
  snapshot: {
    university: {
      name: { type: String, required: true },
      logoAssetId: { type: String, default: undefined },
      logoUrl: { type: String, default: undefined },
    },
    faculty: { type: String, required: true },
    department: { type: String, required: true },
    student: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      matricNumber: { type: String, required: true },
      photoAssetId: { type: String, default: undefined },
      photoUrl: { type: String, default: undefined },
      programme: { type: String, required: true },
      level: { type: String, required: true },
    },
    academicSession: { type: String, required: true },
    semester: { type: String, required: true },
    course: {
      id: { type: String, required: true },
      code: { type: String, required: true },
      title: { type: String, required: true },
    },
    courseRegistrationConfirmed: { type: Boolean, required: true, default: true },
    statistics: {
      sessionsHeld: { type: Number, required: true, min: 0 },
      present: { type: Number, required: true, min: 0 },
      late: { type: Number, required: true, min: 0 },
      absent: { type: Number, required: true, min: 0 },
      excused: { type: Number, required: true, min: 0 },
      attendancePercentage: { type: Number, required: true, min: 0, max: 100 },
      requiredPercentage: { type: Number, required: true, min: 0, max: 100 },
      attendanceScore: { type: Number, required: true, min: 0, max: 100 },
      currentStreak: { type: Number, required: true, min: 0 },
      decision: {
        type: String,
        enum: ['eligible', 'not_eligible', 'pending'],
        required: true,
      },
      calculatedAt: { type: String, required: true },
    },
  },
  sourceDataHash: { type: String, required: true, minlength: 64, maxlength: 64 },
  checksum: { type: String, required: true, minlength: 64, maxlength: 64, index: true },
  digitalSignature: { type: String, required: true, select: false },
  issuedAt: { type: Date, required: true, default: Date.now, index: true },
  generatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  revokedAt: { type: Date, default: undefined },
  revokedBy: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  revokedReason: { type: String, trim: true, maxlength: 240, default: undefined },
  downloadCount: { type: Number, required: true, min: 0, default: 0 },
  printCount: { type: Number, required: true, min: 0, default: 0 },
});

clearanceReportSchema.index({ universityId: 1, studentId: 1, issuedAt: -1 });
clearanceReportSchema.index({ universityId: 1, courseId: 1, status: 1 });
clearanceReportSchema.index({ universityId: 1, registrationNumber: 1, issuedAt: -1 });
clearanceReportSchema.index(
  { universityId: 1, studentId: 1, courseId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'valid', deletedAt: null },
  },
);
applyTenantAuditPlugin(clearanceReportSchema);

export type ClearanceReport = InferSchemaType<typeof clearanceReportSchema>;
export const ClearanceReportModel =
  (models.ClearanceReport as unknown as
    Model<ClearanceReport & TenantAuditedDocument> | undefined) ??
  model<ClearanceReport & TenantAuditedDocument>('ClearanceReport', clearanceReportSchema);
