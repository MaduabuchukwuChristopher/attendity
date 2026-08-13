import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const auditLogSchema = new Schema({
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String, required: true },
  ipAddress: { type: String, select: false },
  userAgent: { type: String, select: false },
  oldValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
  metadata: { type: Schema.Types.Mixed, default: {} },
});
auditLogSchema.index({ universityId: 1, createdAt: -1 });
applyTenantAuditPlugin(auditLogSchema);
const immutableAuditError = () => new Error('Audit records are immutable.');
auditLogSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'],
  function preventMutation() {
    throw immutableAuditError();
  },
);
export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel =
  (models.AuditLog as unknown as Model<AuditLog & TenantAuditedDocument> | undefined) ??
  model<AuditLog & TenantAuditedDocument>('AuditLog', auditLogSchema);
