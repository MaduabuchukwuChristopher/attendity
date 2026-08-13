import mongoose, { type Schema as MongooseSchema, type Types } from 'mongoose';

const { Schema } = mongoose;

export interface TenantAuditedDocument {
  readonly universityId: Types.ObjectId;
  readonly createdBy?: Types.ObjectId;
  readonly updatedBy?: Types.ObjectId;
  readonly deletedAt?: Date;
}

export function applyTenantAuditPlugin(schema: MongooseSchema): void {
  schema.add({
    universityId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'University' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', immutable: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: undefined, index: true },
  });
  schema.set('timestamps', true);
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_document, value: Record<string, unknown>) => {
      delete value.passwordHash;
      return value;
    },
  });
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], function excludeDeleted() {
    if (!this.getFilter().deletedAt) this.where({ deletedAt: { $exists: false } });
  });
}
