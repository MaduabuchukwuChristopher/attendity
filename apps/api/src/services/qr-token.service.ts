import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';
import { environment } from '../config/environment.js';

const payloadSchema = z
  .object({
    sessionId: z.string().min(1),
    universityId: z.string().min(1),
    contextType: z.enum(['CLASS_SESSION', 'EVENT_SESSION']).optional(),
    contextId: z.string().min(1).optional(),
    courseId: z.string().min(1).optional(),
    eventId: z.string().min(1).optional(),
    ownerId: z.string().min(1).optional(),
    lecturerId: z.string().min(1).optional(),
    issuedAt: z.number().int().positive(),
    expiresAt: z.number().int().positive(),
    nonce: z.string().min(20),
  })
  .superRefine((value, context) => {
    const contextId = value.contextId ?? value.courseId ?? value.eventId;
    const ownerId = value.ownerId ?? value.lecturerId;
    if (!contextId)
      context.addIssue({ code: 'custom', message: 'A QR attendance context is required.' });
    if (!ownerId)
      context.addIssue({ code: 'custom', message: 'A QR attendance owner is required.' });
  });

export type QrTokenPayload = z.infer<typeof payloadSchema>;

const optionalClaimBits = {
  contextType: 1,
  contextId: 2,
  courseId: 4,
  eventId: 8,
  ownerId: 16,
  lecturerId: 32,
} as const;

function compactPayload(payload: QrTokenPayload): unknown[] {
  let mask = 0;
  const optionalValues: unknown[] = [];
  for (const [claim, bit] of Object.entries(optionalClaimBits) as Array<
    [keyof typeof optionalClaimBits, number]
  >) {
    const value = payload[claim];
    if (value !== undefined) {
      mask |= bit;
      optionalValues.push(value);
    }
  }
  return [
    mask,
    payload.sessionId,
    payload.universityId,
    ...optionalValues,
    payload.issuedAt,
    payload.expiresAt,
    payload.nonce,
  ];
}

function expandPayload(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const [rawMask, sessionId, universityId, ...remaining] = value;
  if (typeof rawMask !== 'number') return value;
  const expanded: Record<string, unknown> = { sessionId, universityId };
  let cursor = 0;
  for (const [claim, bit] of Object.entries(optionalClaimBits)) {
    if ((rawMask & bit) !== 0) {
      expanded[claim] = remaining[cursor];
      cursor += 1;
    }
  }
  [expanded.issuedAt, expanded.expiresAt, expanded.nonce] = remaining.slice(cursor);
  return expanded;
}

function key(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

function signature(value: string): Buffer {
  return createHmac('sha256', environment.QR_SIGNING_SECRET).update(value).digest();
}

export function hashQrNonce(nonce: string): string {
  return createHash('sha256').update(nonce).digest('hex');
}

export function createQrToken(payload: QrTokenPayload): string {
  const validatedPayload = payloadSchema.parse(payload);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(environment.QR_ENCRYPTION_SECRET), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(compactPayload(validatedPayload)), 'utf8'),
    cipher.final(),
  ]);
  const unsigned = [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
  return `${unsigned}.${signature(unsigned).toString('base64url')}`;
}

export function verifyQrToken(token: string): QrTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== 'v1')
    throw Object.assign(new Error('The QR token is invalid.'), { statusCode: 422 });
  const unsigned = parts.slice(0, 4).join('.');
  const received = Buffer.from(parts[4] ?? '', 'base64url');
  const expected = signature(unsigned);
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    throw Object.assign(new Error('The QR token signature is invalid.'), { statusCode: 422 });
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key(environment.QR_ENCRYPTION_SECRET),
      Buffer.from(parts[1] ?? '', 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(parts[2] ?? '', 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parts[3] ?? '', 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    const payload = payloadSchema.parse(expandPayload(JSON.parse(decrypted)));
    if (payload.expiresAt <= Date.now())
      throw Object.assign(new Error('The QR token has expired.'), { statusCode: 422 });
    return payload;
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) throw error;
    throw Object.assign(new Error('The QR token could not be verified.'), { statusCode: 422 });
  }
}
