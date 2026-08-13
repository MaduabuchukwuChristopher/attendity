import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;

const eventReportSnapshotSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, required: true, ref: 'Event', index: true },
  invited: { type: Number, required: true, min: 0 },
  registered: { type: Number, required: true, min: 0 },
  present: { type: Number, required: true, min: 0 },
  late: { type: Number, required: true, min: 0 },
  absent: { type: Number, required: true, min: 0 },
  excused: { type: Number, required: true, min: 0 },
  rejected: { type: Number, required: true, min: 0 },
  attendanceRate: { type: Number, required: true, min: 0, max: 100 },
  generatedAt: { type: Date, required: true, default: Date.now },
});

eventReportSnapshotSchema.index({ universityId: 1, eventId: 1 }, { unique: true });
eventReportSnapshotSchema.index({ universityId: 1, generatedAt: -1 });
applyTenantAuditPlugin(eventReportSnapshotSchema);

export type EventReportSnapshot = InferSchemaType<typeof eventReportSnapshotSchema>;
export const EventReportSnapshotModel =
  (models.EventReportSnapshot as unknown as
    Model<EventReportSnapshot & TenantAuditedDocument> | undefined) ??
  model<EventReportSnapshot & TenantAuditedDocument>(
    'EventReportSnapshot',
    eventReportSnapshotSchema,
  );
