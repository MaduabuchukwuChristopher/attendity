import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
// apps/api/src/config -> monorepo root
const repositoryRoot = resolve(moduleDirectory, '..', '..', '..', '..');
const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(repositoryRoot, '.env'),
  resolve(moduleDirectory, '..', '..', '.env'),
];
for (const candidate of candidates) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
}

const optionalUrl = z.preprocess((value) => (value === '' ? undefined : value), z.url().optional());
const optionalSecret = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(16).optional(),
);
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrlTemplate = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z
    .string()
    .min(1)
    .refine((value) => {
      try {
        new URL(value.replace('{ip}', '203.0.113.1'));
        return true;
      } catch {
        return false;
      }
    }, 'IP country provider URL template must resolve to a valid URL.')
    .optional(),
);
const environmentBoolean = (defaultValue: boolean) =>
  z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().default(defaultValue),
  );

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('7d'),
    COOKIE_DOMAIN: z.string().min(1).default('localhost'),
    CORS_ORIGIN: z.string().min(1),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
    REFRESH_COOKIE_NAME: z.string().min(1).default('attendity_refresh'),
    QR_ENCRYPTION_SECRET: z.string().min(32).optional(),
    QR_SIGNING_SECRET: z.string().min(32).optional(),
    REPORT_SIGNING_SECRET: z.string().min(32).optional(),
    CLEARANCE_VERIFICATION_BASE_URL: z.url().optional(),
    FACE_VERIFICATION_API_URL: optionalUrl,
    FACE_VERIFICATION_API_KEY: optionalSecret,
    FACE_VERIFICATION_THRESHOLD: z.coerce.number().min(0.5).max(1).default(0.85),
    TRUST_PROXY: environmentBoolean(false),
    ENFORCE_HTTPS: environmentBoolean(false),
    ENABLE_API_DOCS: environmentBoolean(true),
    API_PUBLIC_URL: z.url().default('http://localhost:4000'),
    WEB_APP_URL: z.url().default('http://localhost:5173'),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: environmentBoolean(false),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    SMTP_FROM: optionalString,
    RESEND_API_KEY: optionalSecret,
    RESEND_FROM: optionalString,
    IP_COUNTRY_PROVIDER_URL_TEMPLATE: optionalUrlTemplate,
    IP_COUNTRY_PROVIDER_TOKEN: optionalString,
    IP_COUNTRY_TIMEOUT_MS: z.coerce.number().int().min(300).max(5000).default(1500),
    IP_COUNTRY_CACHE_TTL_SECONDS: z.coerce.number().int().min(300).max(604800).default(86400),
    IP_COUNTRY_RATE_LIMIT: z.coerce.number().int().min(10).max(120).default(30),
    PUSH_DELIVERY_API_URL: optionalUrl,
    PUSH_DELIVERY_API_TOKEN: optionalSecret,
    PUSH_VAPID_PUBLIC_KEY: optionalString,
    PUSH_DELIVERY_TIMEOUT_MS: z.coerce.number().int().min(300).max(10000).default(3000),
    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalSecret,
    CLOUDINARY_FOLDER: z.string().trim().min(1).max(80).default('attendity'),
  })
  .superRefine((values, context) => {
    if (
      values.NODE_ENV === 'production' &&
      values.IP_COUNTRY_PROVIDER_URL_TEMPLATE &&
      new URL(values.IP_COUNTRY_PROVIDER_URL_TEMPLATE.replace('{ip}', '203.0.113.1')).protocol !==
        'https:'
    )
      context.addIssue({
        code: 'custom',
        message: 'The IP country provider must use HTTPS in production.',
        path: ['IP_COUNTRY_PROVIDER_URL_TEMPLATE'],
      });
    const cloudinaryValues = [
      values.CLOUDINARY_CLOUD_NAME,
      values.CLOUDINARY_API_KEY,
      values.CLOUDINARY_API_SECRET,
    ];
    if (cloudinaryValues.some(Boolean) && !cloudinaryValues.every(Boolean))
      context.addIssue({
        code: 'custom',
        message: 'Cloudinary cloud name, API key, and API secret must be configured together.',
        path: ['CLOUDINARY_CLOUD_NAME'],
      });
    if (Boolean(values.FACE_VERIFICATION_API_URL) !== Boolean(values.FACE_VERIFICATION_API_KEY))
      context.addIssue({
        code: 'custom',
        message: 'Both face verification provider variables must be configured together.',
        path: ['FACE_VERIFICATION_API_URL'],
      });
    if (Boolean(values.RESEND_API_KEY) !== Boolean(values.RESEND_FROM))
      context.addIssue({
        code: 'custom',
        message: 'Both Resend API key and sender must be configured together.',
        path: ['RESEND_API_KEY'],
      });
    const pushValues = [
      values.PUSH_DELIVERY_API_URL,
      values.PUSH_DELIVERY_API_TOKEN,
      values.PUSH_VAPID_PUBLIC_KEY,
    ];
    if (pushValues.some(Boolean) && !pushValues.every(Boolean))
      context.addIssue({
        code: 'custom',
        message: 'Push delivery URL, token, and VAPID public key must be configured together.',
        path: ['PUSH_DELIVERY_API_URL'],
      });
    if (
      values.NODE_ENV === 'production' &&
      values.PUSH_DELIVERY_API_URL &&
      new URL(values.PUSH_DELIVERY_API_URL).protocol !== 'https:'
    )
      context.addIssue({
        code: 'custom',
        message: 'The push delivery provider must use HTTPS in production.',
        path: ['PUSH_DELIVERY_API_URL'],
      });
    if (
      values.NODE_ENV === 'production' &&
      (!values.QR_ENCRYPTION_SECRET || !values.QR_SIGNING_SECRET)
    )
      context.addIssue({
        code: 'custom',
        message: 'Dedicated QR encryption and signing secrets are required in production.',
        path: ['QR_ENCRYPTION_SECRET'],
      });
    if (values.NODE_ENV === 'production' && !values.REPORT_SIGNING_SECRET)
      context.addIssue({
        code: 'custom',
        message: 'A dedicated report signing secret is required in production.',
        path: ['REPORT_SIGNING_SECRET'],
      });
    if (values.NODE_ENV === 'production' && !values.ENFORCE_HTTPS)
      context.addIssue({
        code: 'custom',
        message: 'HTTPS enforcement must be enabled in production.',
        path: ['ENFORCE_HTTPS'],
      });
    const resendConfigured = Boolean(values.RESEND_API_KEY && values.RESEND_FROM);
    const smtpConfigured = Boolean(
      values.SMTP_HOST && values.SMTP_USER && values.SMTP_PASSWORD && values.SMTP_FROM,
    );
    if (values.NODE_ENV === 'production' && !resendConfigured && !smtpConfigured)
      context.addIssue({
        code: 'custom',
        message: 'Resend HTTPS or SMTP delivery must be configured in production.',
        path: ['RESEND_API_KEY'],
      });
  })
  .transform((values) => ({
    ...values,
    QR_ENCRYPTION_SECRET: values.QR_ENCRYPTION_SECRET ?? values.JWT_ACCESS_SECRET,
    QR_SIGNING_SECRET: values.QR_SIGNING_SECRET ?? values.JWT_REFRESH_SECRET,
    REPORT_SIGNING_SECRET: values.REPORT_SIGNING_SECRET ?? values.JWT_REFRESH_SECRET,
    CLEARANCE_VERIFICATION_BASE_URL:
      values.CLEARANCE_VERIFICATION_BASE_URL ??
      `${values.CORS_ORIGIN.split(',')[0]?.trim() || 'http://localhost:5173'}/verify/clearance`,
  }));
export const environment = environmentSchema.parse(process.env);
