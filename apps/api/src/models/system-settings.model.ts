import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { INSTITUTION_TYPES } from '@qr/shared';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';
const { model, models, Schema } = mongoose;

const terminologyOverridesSchema = new Schema(
  Object.fromEntries(
    [
      'institution',
      'institutionPlural',
      'primaryUnit',
      'primaryUnitPlural',
      'department',
      'departmentPlural',
      'programme',
      'programmePlural',
      'course',
      'coursePlural',
      'educator',
      'educatorPlural',
      'student',
      'studentPlural',
      'academicPeriod',
      'academicPeriodPlural',
    ].map((field) => [field, { type: String, trim: true, maxlength: 80, default: undefined }]),
  ),
  { _id: false },
);

const settingsSchema = new Schema({
  attendanceRequirement: { type: Number, min: 0, max: 100, default: 75 },
  qrRotationSeconds: { type: Number, min: 30, max: 120, default: 60 },
  gpsRadiusMetres: { type: Number, min: 10, max: 1000, default: 50 },
  lateArrivalMinutes: { type: Number, min: 0, max: 120, default: 15 },
  brandingName: { type: String, trim: true, maxlength: 160, default: 'Attendity' },
  terminologyPreset: {
    type: String,
    enum: [...INSTITUTION_TYPES, 'custom'],
    default: 'university',
  },
  terminologyOverrides: { type: terminologyOverridesSchema, default: {} },
  staffTitlePreference: { type: String, trim: true, maxlength: 80, default: 'Lecturer' },
  studentIdentifierLabel: {
    type: String,
    trim: true,
    maxlength: 80,
    default: 'Student ID',
  },
  studentIdentifierExample: {
    type: String,
    trim: true,
    maxlength: 80,
    default: 'UNI/DEP/2026/001',
  },
  studentIdentifierPattern: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '^[A-Z0-9][A-Z0-9/._-]{2,39}$',
  },
  studentIdentifierGuidance: {
    type: String,
    trim: true,
    maxlength: 240,
    default: 'Enter the identifier issued by your institution.',
  },
  timeZone: { type: String, trim: true, maxlength: 80, default: 'Africa/Lagos' },
  dateFormat: {
    type: String,
    enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
    default: 'DD/MM/YYYY',
  },
  academicSession: { type: String, trim: true, maxlength: 20, default: '2026/2027' },
  currentSemester: { type: String, trim: true, maxlength: 80, default: 'First Semester' },
  electiveRegistrationRequiresApproval: { type: Boolean, default: true },
  reminderAllowedChannels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  maximumReminderWindowMinutes: {
    type: Number,
    min: 5,
    max: 10080,
    default: 1440,
  },
});
settingsSchema.index({ universityId: 1 }, { unique: true });
applyTenantAuditPlugin(settingsSchema);
export type SystemSettings = InferSchemaType<typeof settingsSchema>;
export const SystemSettingsModel =
  (models.SystemSettings as unknown as Model<SystemSettings & TenantAuditedDocument> | undefined) ??
  model<SystemSettings & TenantAuditedDocument>('SystemSettings', settingsSchema);
