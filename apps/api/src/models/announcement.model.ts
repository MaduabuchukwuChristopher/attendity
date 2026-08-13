import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_STATUSES,
  USER_ROLES,
} from '@qr/shared';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const notificationChannels = ['in_app', 'email', 'push', 'sms'] as const;

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

const audienceSchema = new Schema(
  {
    campus: { type: String, trim: true, maxlength: 160, default: undefined },
    facultyName: { type: String, trim: true, maxlength: 160, default: undefined },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: undefined },
    programme: { type: String, trim: true, maxlength: 160, default: undefined },
    level: { type: String, trim: true, maxlength: 40, default: undefined },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: undefined },
    roles: [{ type: String, enum: USER_ROLES }],
  },
  { _id: false },
);

const announcementSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 180, index: true },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: String, enum: ANNOUNCEMENT_CATEGORIES, required: true, index: true },
  priority: {
    type: String,
    enum: ANNOUNCEMENT_PRIORITIES,
    required: true,
    default: 'normal',
    index: true,
  },
  priorityRank: { type: Number, min: 1, max: 4, default: 2, index: true, select: false },
  publisherId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  publisherName: { type: String, required: true, trim: true, maxlength: 180 },
  audience: { type: audienceSchema, required: true, default: { roles: [] } },
  publishAt: { type: Date, default: undefined, index: true },
  publishedAt: { type: Date, default: undefined, index: true },
  expiresAt: { type: Date, default: undefined, index: true },
  attachments: { type: [attachmentSchema], default: [] },
  pinned: { type: Boolean, default: false, index: true },
  acknowledgementRequired: { type: Boolean, default: false },
  channels: { type: [{ type: String, enum: notificationChannels }], default: ['in_app'] },
  status: {
    type: String,
    enum: ANNOUNCEMENT_STATUSES,
    required: true,
    default: 'draft',
    index: true,
  },
  publicationClaimedAt: { type: Date, default: undefined, select: false },
  publicationAttempts: { type: Number, min: 0, default: 0, select: false },
  nextPublishAttemptAt: { type: Date, default: undefined, select: false },
});

announcementSchema.index({ universityId: 1, status: 1, publishAt: 1 });
announcementSchema.index({ universityId: 1, status: 1, pinned: -1, publishedAt: -1 });
announcementSchema.index({ universityId: 1, publisherId: 1, createdAt: -1 });
announcementSchema.index({ universityId: 1, 'audience.courseId': 1, status: 1 });
announcementSchema.index({ title: 'text', message: 'text' });
applyTenantAuditPlugin(announcementSchema);

export type AnnouncementRecord = InferSchemaType<typeof announcementSchema>;
export const AnnouncementModel =
  (models.Announcement as unknown as
    Model<AnnouncementRecord & TenantAuditedDocument> | undefined) ??
  model<AnnouncementRecord & TenantAuditedDocument>('Announcement', announcementSchema);
