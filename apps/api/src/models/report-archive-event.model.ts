import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const reportArchiveEventSchema = new Schema({
  reportId: { type: Schema.Types.ObjectId, required: true, ref: 'ClearanceReport', index: true },
  event: {
    type: String,
    enum: ['generated', 'downloaded_pdf', 'downloaded_excel', 'downloaded_csv', 'printed'],
    required: true,
    index: true,
  },
  format: { type: String, enum: ['pdf', 'xlsx', 'csv', 'print'], required: false },
  checksum: { type: String, required: true, minlength: 64, maxlength: 64 },
  occurredAt: { type: Date, required: true, default: Date.now, index: true },
  ipAddress: { type: String, maxlength: 64, select: false, default: undefined },
  userAgent: { type: String, maxlength: 512, select: false, default: undefined },
});
reportArchiveEventSchema.index({ universityId: 1, reportId: 1, occurredAt: -1 });
applyTenantAuditPlugin(reportArchiveEventSchema);
export type ReportArchiveEvent = InferSchemaType<typeof reportArchiveEventSchema>;
export const ReportArchiveEventModel =
  (models.ReportArchiveEvent as unknown as
    Model<ReportArchiveEvent & TenantAuditedDocument> | undefined) ??
  model<ReportArchiveEvent & TenantAuditedDocument>('ReportArchiveEvent', reportArchiveEventSchema);
