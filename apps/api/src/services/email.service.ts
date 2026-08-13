import nodemailer from 'nodemailer';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';
import { createEmailDelivery } from './email-delivery.js';

const transport = environment.SMTP_HOST
  ? nodemailer.createTransport({
      host: environment.SMTP_HOST,
      port: environment.SMTP_PORT,
      secure: environment.SMTP_SECURE,
      auth:
        environment.SMTP_USER && environment.SMTP_PASSWORD
          ? { user: environment.SMTP_USER, pass: environment.SMTP_PASSWORD }
          : undefined,
    })
  : null;
const delivery = createEmailDelivery({
  resendApiKey: environment.RESEND_API_KEY,
  resendFrom: environment.RESEND_FROM,
  smtpFrom: environment.SMTP_FROM,
  smtpSend: transport ? (message) => transport.sendMail(message) : undefined,
});
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

async function deliver(to: string, subject: string, text: string, html: string): Promise<void> {
  if (!delivery) {
    if (environment.NODE_ENV === 'production') throw new Error('Email delivery is unavailable.');
    logger.info({ to, subject }, 'Development email suppressed because delivery is not configured');
    return;
  }
  await delivery.send({ to, subject, text, html });
}

const configured = Boolean(delivery);

export const emailService = {
  isConfigured: () => configured,
  sendVerification: async (email: string, fullName: string, token: string) => {
    const url = `${environment.WEB_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await deliver(
      email,
      'Verify your Attendity account',
      `Hello ${fullName}, verify your Attendity account: ${url}`,
      `<p>Hello ${escapeHtml(fullName)},</p><p>Verify your Attendity account using the secure link below. It expires in 24 hours.</p><p><a href="${url}">Verify account</a></p>`,
    );
  },
  sendPasswordReset: async (email: string, fullName: string, token: string) => {
    const url = `${environment.WEB_APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await deliver(
      email,
      'Reset your Attendity password',
      `Hello ${fullName}, reset your Attendity password: ${url}`,
      `<p>Hello ${escapeHtml(fullName)},</p><p>Use the secure link below to reset your password. It expires in one hour.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, you can ignore this message.</p>`,
    );
  },
  sendStaffInvitation: async (email: string, role: string, token: string) => {
    const url = `${environment.WEB_APP_URL}/accept-invitation?token=${encodeURIComponent(token)}`;
    const roleLabel = role.replaceAll('_', ' ');
    await deliver(
      email,
      'Your Attendity institution invitation',
      `You have been invited to Attendity as ${roleLabel}. Accept your secure invitation within 72 hours: ${url}`,
      `<p>You have been invited to Attendity as <strong>${escapeHtml(roleLabel)}</strong>.</p><p><a href="${url}">Accept secure invitation</a></p><p>This single-use link expires in 72 hours.</p>`,
    );
  },
  sendClassReminder: async (
    email: string,
    fullName: string,
    input: {
      readonly courseLabel: string;
      readonly startsAtLabel: string;
      readonly venue: string;
    },
  ) => {
    if (!configured)
      throw Object.assign(new Error('Email delivery is unavailable.'), {
        code: 'channel_unavailable',
      });
    const subject = `${input.courseLabel} starts soon`;
    const text = `Hello ${fullName}, ${input.courseLabel} starts ${input.startsAtLabel} at ${input.venue}.`;
    await deliver(
      email,
      subject,
      text,
      `<p>Hello ${escapeHtml(fullName)},</p><p><strong>${escapeHtml(input.courseLabel)}</strong> starts ${escapeHtml(input.startsAtLabel)} at ${escapeHtml(input.venue)}.</p><p>Open Attendity for the latest schedule details.</p>`,
    );
  },
  sendReminderTest: async (email: string, fullName: string) => {
    if (!configured)
      throw Object.assign(new Error('Email delivery is unavailable.'), {
        code: 'channel_unavailable',
      });
    await deliver(
      email,
      'Attendity reminder channel test',
      `Hello ${fullName}, your Attendity email reminder channel is working.`,
      `<p>Hello ${escapeHtml(fullName)},</p><p>Your Attendity email reminder channel is working.</p>`,
    );
  },
  sendAnnouncement: async (
    email: string,
    fullName: string,
    input: { readonly title: string; readonly message: string; readonly announcementId: string },
  ) => {
    if (!configured)
      throw Object.assign(new Error('Email delivery is unavailable.'), {
        code: 'channel_unavailable',
      });
    const url = `${environment.WEB_APP_URL}/app/announcements?announcement=${encodeURIComponent(input.announcementId)}`;
    await deliver(
      email,
      input.title,
      `Hello ${fullName}, ${input.message}\n\nView this announcement in Attendity: ${url}`,
      `<p>Hello ${escapeHtml(fullName)},</p><p>${escapeHtml(input.message).replaceAll('\n', '<br>')}</p><p><a href="${url}">View announcement in Attendity</a></p>`,
    );
  },
  sendEventNotification: async (
    email: string,
    fullName: string,
    input: { readonly title: string; readonly message: string; readonly eventId: string },
  ) => {
    if (!configured)
      throw Object.assign(new Error('Email delivery is unavailable.'), {
        code: 'channel_unavailable',
      });
    const url = `${environment.WEB_APP_URL}/app/events?event=${encodeURIComponent(input.eventId)}`;
    await deliver(
      email,
      input.title,
      `Hello ${fullName}, ${input.message}\n\nView the event in Attendity: ${url}`,
      `<p>Hello ${escapeHtml(fullName)},</p><p>${escapeHtml(input.message)}</p><p><a href="${url}">View event in Attendity</a></p>`,
    );
  },
};
