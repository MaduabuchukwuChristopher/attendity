import { createHash } from 'node:crypto';
import { ContactInquiryModel } from '../models/contact-inquiry.model.js';

export const contactService = {
  submit: async (
    input: {
      universityName: string;
      contactName: string;
      email: string;
      phone?: string;
      message: string;
    },
    ipAddress: string,
  ) => {
    const inquiry = await ContactInquiryModel.create({
      ...input,
      email: input.email.toLowerCase(),
      ipAddressHash: createHash('sha256').update(ipAddress).digest('hex'),
    });
    return { reference: `ATD-${String(inquiry._id).slice(-8).toUpperCase()}` };
  },
};
