import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import {
  applyTenantAuditPlugin,
  type TenantAuditedDocument,
} from './plugins/tenant-audit.plugin.js';

const { model, models, Schema } = mongoose;
const lecturerAssignmentSchema = new Schema({
  lecturerId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  courseId: { type: Schema.Types.ObjectId, required: true, ref: 'Course', index: true },
  academicSessionId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'InstitutionStructure',
    index: true,
  },
  termId: { type: Schema.Types.ObjectId, required: true, ref: 'InstitutionStructure', index: true },
  assignmentRole: { type: String, enum: ['primary', 'co_lecturer'], default: 'primary' },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
});

lecturerAssignmentSchema.index(
  { universityId: 1, lecturerId: 1, courseId: 1, termId: 1 },
  { unique: true },
);
applyTenantAuditPlugin(lecturerAssignmentSchema);

export type LecturerAssignment = InferSchemaType<typeof lecturerAssignmentSchema>;
export const LecturerAssignmentModel =
  (models.LecturerAssignment as unknown as
    Model<LecturerAssignment & TenantAuditedDocument> | undefined) ??
  model<LecturerAssignment & TenantAuditedDocument>('LecturerAssignment', lecturerAssignmentSchema);
