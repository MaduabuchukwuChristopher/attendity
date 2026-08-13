import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  changePasswordSchema,
  emailRequestSchema,
  registerSchema,
} from '../src/validators/auth.validator.js';
import { contactInquirySchema } from '../src/validators/contact.validator.js';

void describe('authentication and public inquiry validation', () => {
  const validRegistration = {
    universityId: 'lagos-metropolitan-university',
    firstName: 'Ada',
    lastName: 'Okafor',
    email: 'ada.okafor@student.lmu.edu.ng',
    password: 'SecurePassphrase2026!',
  };
  void it('accepts a university slug and rejects self-assigned privileged roles', () => {
    assert.equal(registerSchema.safeParse({ body: validRegistration }).success, true);
    assert.equal(
      registerSchema.safeParse({ body: { ...validRegistration, role: 'super_admin' } }).success,
      false,
    );
  });
  void it('enforces secure recovery and password-change inputs', () => {
    assert.equal(
      emailRequestSchema.safeParse({
        body: { universityId: 'lagos-metropolitan-university', email: 'ada@example.edu.ng' },
      }).success,
      true,
    );
    assert.equal(
      changePasswordSchema.safeParse({ body: { currentPassword: 'old', newPassword: 'weak' } })
        .success,
      false,
    );
  });
  void it('accepts legitimate demonstration enquiries and rejects honeypot submissions', () => {
    const inquiry = {
      universityName: 'Lagos Metropolitan University',
      contactName: 'Ada Okafor',
      email: 'ada@example.edu.ng',
      message: 'We would like an institutional demonstration for our academic team.',
    };
    assert.equal(contactInquirySchema.safeParse({ body: inquiry }).success, true);
    assert.equal(
      contactInquirySchema.safeParse({ body: { ...inquiry, website: 'https://spam.example' } })
        .success,
      false,
    );
  });
});
