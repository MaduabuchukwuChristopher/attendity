import { createHash, randomUUID } from 'node:crypto';
import type { AnnouncementAttachment, RequestActor } from '@qr/types';
import { environment } from '../config/environment.js';
import { MediaAssetModel } from '../models/media-asset.model.js';
import { auditService } from './audit.service.js';
import { isImageContent, type ImageMimeType } from './media-image-validation.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

type UploadContext = 'announcement' | 'event' | 'profile' | 'institution_logo';
type AllowedMimeType = (typeof MIME_TYPES)[number];
interface AttachmentInput {
  readonly assetId?: string | undefined;
  readonly name: string;
  readonly url: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

function statusError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function configured(): boolean {
  return Boolean(
    environment.CLOUDINARY_CLOUD_NAME &&
    environment.CLOUDINARY_API_KEY &&
    environment.CLOUDINARY_API_SECRET,
  );
}

function validContent(mimeType: AllowedMimeType, buffer: Buffer): boolean {
  if (mimeType.startsWith('image/')) return isImageContent(mimeType as ImageMimeType, buffer);
  if (mimeType === 'application/pdf') return buffer.subarray(0, 4).toString() === '%PDF';
  if (mimeType === 'text/csv') {
    if (buffer.includes(0)) return false;
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      return true;
    } catch {
      return false;
    }
  }
  const zip = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (!zip) return false;
  const index = buffer.toString('latin1');
  return mimeType.includes('wordprocessingml') ? index.includes('word/') : index.includes('xl/');
}

function safeName(value: string): string {
  const name = value.trim().replaceAll('\\', '/').split('/').at(-1)?.slice(0, 180) ?? '';
  const containsControlCharacter = [...name].some((character) => character.charCodeAt(0) <= 31);
  if (!name || /[<>]/.test(name) || containsControlCharacter)
    throw statusError('The file name is invalid.', 422);
  return name;
}

export class MediaUploadService {
  configuration() {
    return {
      configured: configured(),
      maximumSizeBytes: MAX_FILE_SIZE,
      allowedMimeTypes: MIME_TYPES,
      provider: configured() ? ('cloudinary' as const) : undefined,
    };
  }

  async upload(
    actor: RequestActor,
    input: {
      readonly context: UploadContext;
      readonly name: string;
      readonly mimeType: string;
      readonly buffer: Buffer;
    },
  ): Promise<AnnouncementAttachment> {
    if (!configured())
      throw statusError('Secure file storage is not configured for this deployment.', 503);
    if (!MIME_TYPES.includes(input.mimeType as AllowedMimeType))
      throw statusError('This file type is not allowed.', 415);
    if (
      ['profile', 'institution_logo'].includes(input.context) &&
      !['image/jpeg', 'image/png', 'image/webp'].includes(input.mimeType)
    )
      throw statusError(
        'Profile photographs and institution logos must be JPEG, PNG, or WebP images.',
        415,
      );
    if (!input.buffer.length || input.buffer.length > MAX_FILE_SIZE)
      throw statusError('Files must be between 1 byte and 10 MB.', 413);
    const mimeType = input.mimeType as AllowedMimeType;
    if (!validContent(mimeType, input.buffer))
      throw statusError('The file content does not match its declared type.', 422);
    const name = safeName(input.name);
    const checksum = createHash('sha256').update(input.buffer).digest('hex');
    const publicId = randomUUID();
    const folder = `${environment.CLOUDINARY_FOLDER}/${actor.universityId}/${input.context}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash('sha1')
      .update(
        `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${environment.CLOUDINARY_API_SECRET}`,
      )
      .digest('hex');
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(input.buffer)], { type: mimeType }), name);
    form.append('api_key', environment.CLOUDINARY_API_KEY!);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('public_id', publicId);
    form.append('signature', signature);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(environment.CLOUDINARY_CLOUD_NAME!)}/auto/upload`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(15_000) },
    );
    if (!response.ok) throw statusError('Secure file storage rejected the upload.', 502);
    const result = (await response.json()) as {
      readonly secure_url?: unknown;
      readonly public_id?: unknown;
      readonly bytes?: unknown;
    };
    if (
      typeof result.secure_url !== 'string' ||
      !result.secure_url.startsWith('https://res.cloudinary.com/') ||
      typeof result.public_id !== 'string' ||
      typeof result.bytes !== 'number'
    )
      throw statusError('Secure file storage returned an invalid response.', 502);
    const asset = await MediaAssetModel.create({
      universityId: actor.universityId,
      context: input.context,
      provider: 'cloudinary',
      providerAssetId: result.public_id,
      name,
      url: result.secure_url,
      mimeType,
      sizeBytes: result.bytes,
      checksum,
      uploadedBy: actor.id,
      status: 'ready',
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    await auditService.record({
      action: 'media.uploaded',
      resourceType: 'media_asset',
      resourceId: asset.id,
      actor,
      newValue: { context: input.context, name, mimeType, sizeBytes: result.bytes, checksum },
    });
    return { assetId: asset.id, name, url: result.secure_url, mimeType, sizeBytes: result.bytes };
  }

  async assertOwnedProfilePhoto(
    actor: RequestActor,
    assetId: string | undefined,
    url: string | undefined,
  ): Promise<void> {
    if (!assetId && !url) return;
    if (!assetId || !url)
      throw statusError('Profile photographs must use a secure uploaded asset.', 422);
    const asset = await MediaAssetModel.findOne({
      _id: assetId,
      universityId: actor.universityId,
      uploadedBy: actor.id,
      context: 'profile',
      status: 'ready',
      url,
      mimeType: { $in: ['image/jpeg', 'image/png', 'image/webp'] },
    })
      .select('_id')
      .lean()
      .exec();
    if (!asset)
      throw statusError('The profile photograph is invalid or belongs to another account.', 422);
  }

  async assertInstitutionLogo(actor: RequestActor, assetId: string, url: string): Promise<void> {
    const asset = await MediaAssetModel.findOne({
      _id: assetId,
      universityId: actor.universityId,
      context: 'institution_logo',
      status: 'ready',
      url,
      mimeType: { $in: ['image/jpeg', 'image/png', 'image/webp'] },
    })
      .select('_id')
      .lean()
      .exec();
    if (!asset)
      throw statusError('The institution logo is invalid or belongs to another institution.', 422);
  }

  async retire(actor: RequestActor, assetId: string): Promise<void> {
    await MediaAssetModel.updateOne(
      { _id: assetId, universityId: actor.universityId, status: 'ready' },
      { $set: { status: 'deleted', updatedBy: actor.id } },
    ).exec();
  }

  async assertOwnedAttachments(
    actor: RequestActor,
    context: UploadContext,
    attachments: readonly AttachmentInput[],
    legacy: readonly AttachmentInput[] = [],
  ): Promise<void> {
    const legacyKeys = new Set(
      legacy.map((item) => `${item.url}|${item.name}|${item.mimeType}|${item.sizeBytes}`),
    );
    const newAttachments = attachments.filter(
      (item) => !legacyKeys.has(`${item.url}|${item.name}|${item.mimeType}|${item.sizeBytes}`),
    );
    if (!newAttachments.length) return;
    if (newAttachments.some((item) => !item.assetId))
      throw statusError('New attachments must be uploaded through Attendity secure storage.', 422);
    const assets = await MediaAssetModel.find({
      _id: { $in: newAttachments.map((item) => item.assetId) },
      universityId: actor.universityId,
      context,
      status: 'ready',
    })
      .select('name url mimeType sizeBytes')
      .lean()
      .exec();
    const map = new Map(assets.map((asset) => [String(asset._id), asset]));
    for (const attachment of newAttachments) {
      const asset = map.get(attachment.assetId!);
      if (
        !asset ||
        asset.name !== attachment.name ||
        asset.url !== attachment.url ||
        asset.mimeType !== attachment.mimeType ||
        asset.sizeBytes !== attachment.sizeBytes
      )
        throw statusError('An attachment is invalid or belongs to another institution.', 422);
    }
  }
}

export const mediaUploadService = new MediaUploadService();
