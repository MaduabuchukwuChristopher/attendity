import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { INSTITUTION_TYPES } from '@qr/shared';

const { model, models, Schema } = mongoose;

const universitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    logoAssetId: { type: Schema.Types.ObjectId, ref: 'MediaAsset', default: undefined },
    logoUrl: { type: String, default: undefined },
    institutionType: {
      type: String,
      enum: INSTITUTION_TYPES,
      default: 'university',
      index: true,
    },
    countryCode: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
      default: 'NG',
      index: true,
    },
    countryName: { type: String, trim: true, maxlength: 120, default: 'Nigeria' },
    primaryColor: { type: String, trim: true, default: '#14532D' },
    secondaryColor: { type: String, trim: true, default: '#B8892D' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } },
);
export type University = InferSchemaType<typeof universitySchema>;
export const UniversityModel =
  (models.University as Model<University> | undefined) ??
  model<University>('University', universitySchema);
