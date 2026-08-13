import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const { model, models, Schema } = mongoose;
const contactInquirySchema = new Schema(
  {
    universityName: { type: String, required: true, trim: true, maxlength: 160 },
    contactName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    phone: { type: String, trim: true, maxlength: 30, default: undefined },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['new', 'in_progress', 'resolved'], default: 'new', index: true },
    source: { type: String, enum: ['landing_contact'], default: 'landing_contact' },
    ipAddressHash: { type: String, required: true, select: false },
  },
  { timestamps: true, collection: 'contact_inquiries' },
);
contactInquirySchema.index({ createdAt: -1 });
export type ContactInquiry = InferSchemaType<typeof contactInquirySchema>;
export const ContactInquiryModel =
  (models.ContactInquiry as Model<ContactInquiry> | undefined) ??
  model<ContactInquiry>('ContactInquiry', contactInquirySchema);
